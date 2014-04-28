
function MGCanvas(canvasDOMObj){
	var that = this;

	this.initGraphicContext(canvasDOMObj);
	this.tickPerSecond = 30;
	this.tickCount = 0;
	this.tickTimer = window.setInterval(function(){ that.tick(); }, 1000 / this.tickPerSecond);
	this.isPaused = false;
	this.isEnabledAutomaticTracking = true;
	this.nodeList = new Array();
	this.edgeList = new Array();
	this.selectedNode = null;
	this.selectedEdge = null;
	this.srcMemoryDB = null;
	this.srcMemoryDBSyncPerTick = 60;
	this.srcMemoryDBSyncCount = this.srcMemoryDBSyncPerTick;
	
	var that = this;
	window.addEventListener('keydown', function(event){
		switch(event.keyCode){
			case 37:	//左カーソル
				that.moveViewRelative(-10, 0);
				break;
			case 39:	//右カーソル
				that.moveViewRelative(10, 0);
				break;
			case 38:	//上カーソル
				that.moveViewRelative(0, -10);
				break;
			case 40:	//下カーソル
				that.moveViewRelative(0, 10);
				break;
		}
	}, true);
	
	this.isMouseDown = false;
	this.mouseDownPosition = new Point2D(0, 0);
	this.lastMousePosition = new Point2D(0, 0);
	this.canvas.onmousemove = function (e){
		if(that.isMouseDown){
			if(!e){
				//for IE
				e = window.event;
			}
			that.lastMousePosition = that.getMousePositionOnElement(e);
		}
	};
	this.canvas.onmousedown = function (e){
		if(!e){
			//for IE
			e = window.event;
		}
		that.lastMousePosition = that.getMousePositionOnElement(e);
		that.mouseDownPosition = that.lastMousePosition;
		var p = that.convertPointToGraphLayerFromCanvasLayerP(that.lastMousePosition);
		//console.log(p.x + "," + p.y);
		var node = that.getNodeAtPointP(p);
		that.selectNode(node);
		var edge = that.getEdgeAtPointP(p);
		that.selectEdge(edge);
		that.isMouseDown = true;
		that.isEnabledAutomaticTracking = false;
	};
	this.canvas.onmouseup = function (e){
		that.isMouseDown = false;
	};
}
MGCanvas.prototype = {
	setGraph: function(gArray){
		//gArray = [[Node1, Node2, Node3, ...], [[Node1, Node3], [Node3, Node2], ...]]
		var that = this;
		var p = gArray[0];
		var n = function(identifier){ return that.nodeList.isIncluded(identifier, function(a, b){ return (a.identifier == b); }); };
		
		for(var i = 0, iLen = p.length; i < iLen; i++){
			this.nodeList.push(new MGNode(this, p[i]));
		}
		
		p = gArray[1];
		for(var i = 0, iLen = p.length; i < iLen; i++){
			this.edgeList.push(new MGEdge(this, p[i][2], n(p[i][0]), n(p[i][1])));
		}
	},
	setSourceMemoryDB: function(mdb){
		var that = this;
		this.srcMemoryDB = mdb;
		mdb.callback_updatedNode = function(t){
			var n;
			n = that.nodeList.isIncluded(t.nodeid, function(a, b){ return a.nodeid == b; });
			if(!n){
				// 新規追加
				n = new MGNode(that, t.identifier);
				n.nodeid = t.nodeid;
				that.nodeList.push(n);
			} else{
				// 更新
				n.identifier = t.identifier;
			}
		}
	},
	bringToCenter: function(){
		// 重心を求めて、それを表示オフセットに設定する
		var g = new Point2D(0, 0);
		var p;
		p = this.nodeList;
		for(var i = 0, iLen = p.length; i < iLen; i++){
			g.x += p[i].position.x;
			g.y += p[i].position.y;
		}
		g.x /= p.length;
		g.y /= p.length;
		
		this.positionOffset.x = -g.x;
		this.positionOffset.y = -g.y;
		
		this.isEnabledAutomaticTracking = true;
	},
	zoomIn: function(){
		this.context.scale(2, 2);
		this.currentScale *= 2;
	},
	zoomOut: function(){
		this.context.scale(0.5, 0.5);
		this.currentScale *= 0.5;
	},
	moveViewRelative: function(x, y){
		this.positionOffset.x += -x;
		this.positionOffset.y += -y;
	},
	bringInScreen: function(){
		//大きく外れていないときには動かさない
		var g = new Point2D(0, 0);
		var f = new Point2D(0, 0);
		var p;
		p = this.nodeList;
		for(var i = 0, iLen = p.length; i < iLen; i++){
			g.x += p[i].position.x;
			g.y += p[i].position.y;
		}
		g.x /= p.length;
		g.y /= p.length;
		g.x += this.positionOffset.x;
		g.y += this.positionOffset.y;
		if(	g.x < this.displayRect.origin.x / 2 || 
			g.x > -this.displayRect.origin.x / 2 || 
			g.y < this.displayRect.origin.y / 2 || 
			g.y > -this.displayRect.origin.x / 2){
			
			this.positionOffset.x += -g.x;
			this.positionOffset.y += -g.y;
		}
	},
	tick: function(){
		var p;
		var t;
		var dr;
		var n = null;
		var nMax = 0;
		var nTemp;
		
		this.tickCount++;
		this.srcMemoryDBSyncCount++;
		
		//
		// Sync
		//
		if(this.srcMemoryDB && this.srcMemoryDBSyncCount > this.srcMemoryDBSyncPerTick){
			this.srcMemoryDB.syncDB();
			this.srcMemoryDBSyncCount = 0;
		}
		
		//
		// AutomaticTracking
		//
		if(this.isEnabledAutomaticTracking && (this.tickCount % 30 == 0)){
			this.bringInScreen();
		}

		
		//
		// View moving with mouse
		//
		if(this.isMouseDown){
			this.moveViewRelative(
				(this.mouseDownPosition.x - this.lastMousePosition.x) * 4 / this.tickPerSecond,
				(this.mouseDownPosition.y - this.lastMousePosition.y) * 4 / this.tickPerSecond
			);
		}
		
		if(!this.isPaused){
			//
			// Check
			//
			/*
			p = this.nodeList;
			for(var i = 0, iLen = p.length; i < iLen; i++){
				nTemp = this.getVectorLength(p[i].vector);
				if(nMax < nTemp){
					n = p[i];
					nMax = nTemp;
				}
			}
			if(n){
				n.ignoreEdgeRepulsion = 10;
			}
			*/
			
			//
			// Move
			//
			p = this.nodeList;
			for(var i = 0, iLen = p.length; i < iLen; i++){
				this.nodeList[i].tick();
			}
			p = this.edgeList;
			for(var i = 0, iLen = p.length; i < iLen; i++){
				this.edgeList[i].tick();
			}
		}
		
		//
		// Refresh
		//
		dr = this.displayRect;
		
		this.context.scale(1 / this.currentScale, 1 / this.currentScale);
		this.context.clearRect(dr.origin.x, dr.origin.y, dr.size.x, dr.size.y);
		this.context.scale(this.currentScale, this.currentScale);
		
		this.context.translate(this.positionOffset.x, this.positionOffset.y);
		
		p = this.nodeList;
		for(var i = 0, iLen = p.length; i < iLen; i++){
			this.nodeList[i].draw();
		}
		
		p = this.edgeList;
		for(var i = 0, iLen = p.length; i < iLen; i++){
			this.edgeList[i].draw();
		}
		
		this.context.translate(-this.positionOffset.x, -this.positionOffset.y);
		
	},
	getMousePositionOnElement: function(e){
		// http://tmlife.net/programming/javascript/javascript-mouse-pos.html
		// retv:
		var retv = new Object();
		var rect = e.target.getBoundingClientRect();
		retv.x = e.clientX - rect.left;
		retv.y = e.clientY - rect.top;
		return retv;
	},
	fillRect: function(x, y, w, h){
		var d = this.drawCoordinatesInInteger;
		this.context.fillRect(d(x), d(y), d(w), d(h));
	},
	strokeRect: function(x, y, w, h){
		var d = this.drawCoordinatesInInteger;
		this.context.strokeRect(d(x), d(y), d(w), d(h));
	},
	drawCoordinatesInInteger: function(coordinateElement){
		//from http://www.html5rocks.com/ja/tutorials/canvas/performance/
		// With a bitwise or.
		return ((0.5 + coordinateElement) | 0);
	},
	drawCircle: function(x, y, r){
		var d = this.drawCoordinatesInInteger;
		this.context.beginPath();
		this.context.arc(d(x), d(y), d(r), 0, 2 * Math.PI);
		this.context.closePath();
		this.context.fill();
		this.context.stroke();
	},
	drawLineP: function(p, q){
		var d = this.drawCoordinatesInInteger;
		this.context.beginPath();
		this.context.moveTo(d(p.x), d(p.y));
		this.context.lineTo(d(q.x), d(q.y));
		this.context.closePath();
		this.context.stroke();
	},
	drawText: function(text, x, y){
		//背景をfillStyle
		//前景をstrokeStyleで塗りつぶした文字列を描画する
		//塗りつぶし高さは20px固定
		//座標は文字列の左上の座標となる
		var textsize = this.context.measureText(text);
		this.context.fillRect(x, y, textsize.width, 20);
		this.context.save();
		this.context.fillStyle = this.context.strokeStyle;
		//fillText引数の座標は文字列の左下！
		this.context.fillText(text, x, y + 20 - 1);
		this.context.restore();
	},
	getVectorLengthP: function(p, q){
		return this.getVectorLength(this.getVectorP(p, q));
	},
	getVectorLength: function(a){
		return Math.sqrt(a.x * a.x + a.y * a.y);
	},
	getVectorP: function(p, q){
		return new Point2D(q.x - p.x, q.y - p.y);
	},
	getUnitVectorP: function(p, q){
		var e = this.getVectorP(p, q);
		return this.getUnitVector(e);
	},
	getUnitVector: function(a){
		var l = Math.sqrt(a.x * a.x + a.y * a.y);
		a.x /= l;
		a.y /= l;
		return a;
	},
	getNormalUnitVectorSideOfP: function(a, b, p){
		//直線ab上にない点pが存在する側へ向かう単位法線ベクトルを返す。
		return this.getUnitVector(this.getNormalVectorSideOfP(a, b, p));
	},
	getNormalVectorSideOfP: function(a, b, p){
		//直線ab上にない点pが存在する側へ向かう法線ベクトルを返す。
		//pがab上にある場合は零ベクトルとなる。
		var n = this.getVectorP(a, b);
		var t = n.x;
		var i;
		n.x = -n.y;
		n.y = t;
		
		i = this.getInnerVector2D(n, this.getVectorP(a, p));
		if(i < 0){
			//この法線ベクトルとapの向きが逆なので反転する。
			n.x = -n.x;
			n.y = -n.y;
		} else if(i == 0){
			n.x = 0;
			n.y = 0;
		}
		return n;
	},
	getExteriorVector2D: function(a, b){
		return a.x * b.y - a.y * b.x;
	},
	getInnerVector2D: function(a, b){
		return a.x * b.x + a.y * b.y;
	},
	getDistanceDotAndLineP: function(p, a, b){
		// http://www.sousakuba.com/Programming/gs_dot_line_distance.html
		var ab;
		var ap;
		var s;
		var l;
		var d;
		
		ab = this.getVectorP(a, b);
		ap = this.getVectorP(a, p);
		
		s = Math.abs(this.getExteriorVector2D(ab, ap));
		l = this.getVectorLengthP(a, b);
		d = (s / l);
		
		s = this.getInnerVector2D(ap, ab);
		if(s < 0){
			//線分の範囲外なので端点aからの距離に変換
			//端点から垂線の足までの距離
			l = - (s / l);
			d = Math.sqrt(d * d + l * l);
		} else if(s > l * l){
			//同様に端点bからの距離に変換
			l = s / l;
			d = Math.sqrt(d * d + l * l);
		}
		return d;
	},
	initGraphicContext: function(newCanvas){
		this.canvas = newCanvas;
		this.context = this.canvas.getContext('2d');
		this.context.fillStyle = "rgba(255,255,255,0.5)";
		this.context.strokeStyle = "rgba(0, 0, 0, 1)";
		this.context.font = "normal 20px sans-serif";
		var w = this.canvas.width / 2;
		var h = this.canvas.height / 2;
		this.context.translate(w, h);
		this.displayRect = new Rectangle(-w, -h, this.canvas.width, this.canvas.height);
		this.currentScale = 1;
		this.zoomOut();
		this.positionOffset = new Point2D(0, 0);
	},
	convertPointToGraphLayerFromCanvasLayerP: function(pCanvas){
		var p = new Point2D(pCanvas.x, pCanvas.y);
		// Canvasの中心が原点
		p.x -= this.canvas.width / 2;
		p.y -= this.canvas.height / 2;
		// スケール変換
		p.x /= this.currentScale;
		p.y /= this.currentScale;
		
		// オフセット平行移動
		p.x -= this.positionOffset.x;
		p.y -= this.positionOffset.y;
		
		return p;
	},
	getNodeAtPointP: function(p){
		var r = new Rectangle(p.x - 10, p.y - 10, 20, 20);
		
		var nl = this.nodeList;
		for(var i = 0, iLen = nl.length; i < iLen; i++){
			if(r.isIncludePointP(nl[i].position)){
				return nl[i];
			}
		}
		return null;
	},
	getEdgeAtPointP: function(p){
		var r = new Rectangle(p.x - 10, p.y - 10, 20, 20);
		
		var el = this.edgeList;
		for(var i = 0, iLen = el.length; i < iLen; i++){
			if(r.isIncludePointP(el[i].centerPoint)){
				return el[i];
			}
		}
		return null;
	},
	selectNode: function(node){
		if(this.selectedNode){
			this.selectedNode.isSelected = false;
		}
		if(node){
			node.isSelected = true;
		}
		this.selectedNode = node;
	},
	selectEdge: function(edge){
		if(this.selectedEdge){
			this.selectedEdge.isSelected = false;
		}
		if(edge){
			edge.isSelected = true;
		}
		this.selectedEdge = edge;
	},
	setIdentifierForSelectedNode: function(str){
		if(this.selectedNode){
			if(this.srcMemoryDB){
				this.srcMemoryDB.updateNode(str, this.selectedNode.typeid, this.selectedNode.nodeid);
			} else{
				this.selectedNode.identifier = str;
			}
		}
	},
}

function MGNode(env, identifier){
	this.env = env;
	//
	this.identifier = identifier;
	//
	this.nodeid = undefined;
	this.typeid = undefined;
	//
	this.position = new Point2D(Math.random() * 32 - 16, Math.random() * 32 - 16);
	this.size = 10;
	//ランダムな初期ベクトルをもつ。
	this.vector = new Point2D(Math.random() * 2 - 1, Math.random() * 2 - 1);
	this.friction = 50 / 100;
	this.repulsionLengthNode = 90;
	this.repulsionLengthEdge = 90;
	this.ignoreEdgeRepulsion = 0;
	//
	this.strokeStyle = "rgba(0, 0, 0, 1)";
	this.isSelected = false;
}
MGNode.prototype = {
	draw: function(){
		if(this.isSelected){
			this.env.context.strokeStyle = "rgba(255, 0, 0, 1)";
		} else{
			this.env.context.strokeStyle = this.strokeStyle;
		}
		this.env.drawCircle(this.position.x, this.position.y, this.size);
		if(this.identifier){
			this.env.drawText(this.identifier.toString(), this.position.x + 10, this.position.y + 10);
		}
	},
	tick: function(){
		var e;
		var p;
		var l;
		var q;
		this.position.x += this.vector.x;
		this.position.y += this.vector.y;
		this.vector.x *= this.friction;
		this.vector.y *= this.friction;
		
		if(!this.ignoreEdgeRepulsion){
			//node
			//距離の近い点同士には斥力が働くとする。
			p = this.env.nodeList;
			for(var i = 0, iLen = p.length; i < iLen; i++){
				var q = this.env.nodeList[i];
				if(q != this){
					l = this.env.getVectorLengthP(this.position, q.position);
					if(l < this.repulsionLengthNode && l != 0){
						e = this.env.getUnitVectorP(q.position, this.position);
						e.x *= this.repulsionLengthNode / l;
						e.y *= this.repulsionLengthNode / l;
						this.vector.x += e.x;
						this.vector.y += e.y;
					}
				}
			}
			
			//edge
			//自分を端点に含まないエッジとの距離が近い場合、そのエッジから遠ざかろうとする。
			/*
			p = this.env.edgeList;
			for(var i = 0, iLen = p.length; i < iLen; i++){
				var q = this.env.edgeList[i];
				if(q.node0 != this && q.node1 != this){
					l = this.env.getDistanceDotAndLineP(this.position, q.node0.position, q.node1.position);
					if(l < this.repulsionLengthEdge && l != 0){
						if(l < 1){
							l = 1;
						}
						e = this.env.getNormalUnitVectorSideOfP(q.node0.position, q.node1.position, this.position);
						e.x *= this.repulsionLengthEdge / l;
						e.y *= this.repulsionLengthEdge / l;
						this.vector.x += e.x;
						this.vector.y += e.y;
						q.node0.vector.x -= e.x / 2;
						q.node0.vector.y -= e.y / 2;
						q.node1.vector.x -= e.x / 2;
						q.node1.vector.y -= e.y / 2;
					}
				}
			}
			*/
		} else{
			this.ignoreEdgeRepulsion--;
		}
		
	},
}

function MGEdge(env, identifier, node0, node1){
	this.env = env;
	this.identifier = identifier;
	this.node0 = node0;
	this.node1 = node1;
	this.freeLength = 250;
	//
	this.strokeStyle = "rgba(0, 0, 0, 0.5)";
	this.isSelected = false;
	//
	this.centerPoint = new Point2D(0, 0);
}
MGEdge.prototype = {
	draw: function(){
		if(this.isSelected){
			this.env.context.strokeStyle = "rgba(255, 0, 0, 1)";
		} else{
			this.env.context.strokeStyle = this.strokeStyle;
		}
		if(this.node0 && this.node1){
			this.drawCurvedLineP(this.node0.position, this.node1.position);
			this.env.strokeRect(this.centerPoint.x - 8, this.centerPoint.y - 8, 16, 16);
			if(this.identifier){
				this.env.drawText(this.identifier.toString(), this.centerPoint.x, this.centerPoint.y);
			}
		}
	},
	tick: function(){
		var l = this.env.getVectorLengthP(this.node0.position, this.node1.position);
		var e;
		if(l > this.freeLength){
			e = this.env.getUnitVectorP(this.node0.position, this.node1.position);
			e.x *= l / this.freeLength;
			e.y *= l / this.freeLength;
			this.node0.vector.x += e.x;
			this.node0.vector.y += e.y;
			this.node1.vector.x -= e.x;
			this.node1.vector.y -= e.y;
		}
		this.centerPoint = new Point2D((this.node0.position.x + this.node1.position.x) / 2, (this.node0.position.y + this.node1.position.y) / 2);
	},
	drawCurvedLineP: function(p, q){
		var that = this;
		var d = function(x){ return that.env.drawCoordinatesInInteger(x); };
		var v = this.env.getUnitVectorP(p, q);
		var w = new Point2D(-(v.y * 50), v.x * 50);
		this.env.context.beginPath();
		this.env.context.moveTo(d(p.x), d(p.y));
		this.env.context.bezierCurveTo(d(this.centerPoint.x + w.x), d(this.centerPoint.y + w.y), d(this.centerPoint.x - w.x), d(this.centerPoint.y - w.y), d(q.x), d(q.y));
		//this.env.context.closePath();
		this.env.context.stroke();
	},
}

function Point2D(x, y){
	this.x = x;
	this.y = y;
}
Point2D.prototype = {
	
}

function Rectangle(x, y, width, height){
	this.origin = new Point2D(x,y);
	this.size = new Point2D(width,height);
}
Rectangle.prototype = {
	isIncludePointP: function(p){
		return 	(this.origin.x <= p.x) && (p.x <= this.origin.x + this.size.x) &&
				(this.origin.y <= p.y) && (p.y <= this.origin.y + this.size.y);
	},
}

