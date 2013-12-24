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
	tick: function(){
		var p;
		var t;
		var dr;
		
		this.tickCount++;
		//console.log(this.tickCount);
		
		//
		// Moving
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
	getVectorLengthP: function(p, q){
		var d = new Point2D(p.x - q.x, p.y - q.y);
		return Math.sqrt(d.x * d.x + d.y * d.y);
	},
	getUnitVectorP: function(p, q){
		var e = new Point2D(q.x - p.x, q.y - p.y);
		var l = Math.sqrt(e.x * e.x + e.y * e.y);
		e.x /= l;
		e.y /= l;
		return e;
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
}

function MGNode(env, identifier){
	this.env = env;
	this.identifier = identifier;
	this.position = new Point2D(0, 0);
	this.size = 10;
	//ランダムな初期ベクトルをもつ。
	this.vector = new Point2D(Math.random() * 2 - 1, Math.random() * 2 - 1);
}
MGNode.prototype = {
	draw: function(){
		this.env.drawCircle(this.position.x, this.position.y, this.size);
	},
	tick: function(){
		this.position.x += this.vector.x;
		this.position.y += this.vector.y;
	},
}

function MGEdge(env, identifier, node0, node1){
	this.env = env;
	this.identifier = identifier;
	this.node0 = node0;
	this.node1 = node1;
	this.freeLength = 100;
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

