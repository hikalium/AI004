//文字列をキーとする。

//まず、最も多数のエッジを持つノードを探す。
//それを起点にして、エッジをたどる。

function MGCanvas(canvasDOMObj){
	var that = this;

	this.initGraphicContext(canvasDOMObj);
	this.tickPerSecond = 30;
	this.tickCount = 0;
	this.tickTimer = window.setInterval(function(){ that.tick(); }, 1000/this.tickPerSecond);
	this.nodeList = new Array();
	this.edgeList = new Array();
	
	var that = this;
	this.canvas.onmousemove = function (e){
		if(!e){
			//for IE
			e = window.event;
		}
		var loc = that.getMousePositionOnElement(e);
		// 出力テスト
		//console.log("x:" + loc.x);
		//console.log("y:" + loc.y);
	};
	//ファイルの入力を受け付ける場合はコメントを外す
	//this.canvas.addEventListener('dragover', function(evt){ return that.handleDragOver(evt); }, false);
	//this.canvas.addEventListener('drop', function(evt){ return that.handleFileSelect(evt); }, false);
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
	bringToCenter: function(){
		var g = new Point2D(0, 0);
		var p;
		p = this.nodeList;
		for(var i = 0, iLen = p.length; i < iLen; i++){
			g.x += p[i].position.x;
			g.y += p[i].position.y;
		}
		g.x /= p.length;
		g.y /= p.length;
		for(var i = 0, iLen = p.length; i < iLen; i++){
			p[i].position.x -= g.x;
			p[i].position.y -= g.y;
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
		//console.log(this.tickCount);
		
		//
		// Check
		//
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
		
		//
		// Refresh
		//
		dr = this.displayRect;
		this.context.clearRect(dr.origin.x, dr.origin.y, dr.size.x, dr.size.y);
		p = this.nodeList;
		for(var i = 0, iLen = p.length; i < iLen; i++){
			this.nodeList[i].draw();
		}
		p = this.edgeList;
		for(var i = 0, iLen = p.length; i < iLen; i++){
			this.edgeList[i].draw();
		}
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
	},
	loadAIMemory: function(str){
		console.log(str);
	},
	// http://www.html5rocks.com/ja/tutorials/file/dndfiles/
	handleFileSelect: function(evt){
		evt.stopPropagation();
		evt.preventDefault();
	
		var files = evt.dataTransfer.files; // FileList object.
		var that = this;
		
		// files is a FileList of File objects. List some properties.
		var output = [];
		for(var i = 0, f; f = files[i]; i++){
			var r = new FileReader();
			r.onload = (function(file){
				return function(e){
					//mainAI.sendTextFromFileToAI(r.result, file.name, file.lastModifiedDate, "File");
					that.loadAIMemory(r.result);
				}
			})(f);
			r.readAsText(f);
		}
	},
	handleDragOver: function(evt){
		evt.stopPropagation();
		evt.preventDefault();
		evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
	},
}

function MGNode(env, identifier){
	this.env = env;
	this.identifier = identifier;
	this.position = new Point2D(0, 0);
	this.size = 10;
	//ランダムな初期ベクトルをもつ。
	this.vector = new Point2D(Math.random() * 2 - 1, Math.random() * 2 - 1);
	this.friction = (100 - 7) / 100;
	this.repulsionLengthNode = 100;
	this.repulsionLengthEdge = 75;
	this.ignoreEdgeRepulsion = 0;
}
MGNode.prototype = {
	draw: function(){
		this.env.drawCircle(this.position.x, this.position.y, this.size);
		this.env.drawText(this.identifier.toString(), this.position.x + 10, this.position.y + 10);
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
}
MGEdge.prototype = {
	draw: function(){
		if(this.node0 && this.node1){
			this.env.drawLineP(this.node0.position, this.node1.position);
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
	
}

