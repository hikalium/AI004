// 知識表現のデータベース
// php経由でMySQLデータベースに同期する機能と
// データへのアクセスを提供する

function MemoryDB(syncPHPURL){
	// 全データ
	this.root = new Array();
	//
	this.nodeList = new Array();
	//
	this.syncPHPURL = syncPHPURL;
	this.isEnabledNetDB = true;
	//
	this.callback_addNode = null;	// function(nodeinstance){};
}
MemoryDB.prototype = {
	UUID_Null: "00000000-0000-0000-0000-000000000000",
	UUID_NodeType_DecimalNumber: "e3346fd4-ac17-41c3-b3c7-e04972e5c014",
	UUID_Node_MemoryDBNetworkTimestamp: "a2560a9c-dcf7-4746-ac14-347188518cf2",
	createRequestObject: function(){
		var rq = null;
		// XMLHttpRequest
		try{
			// XMLHttpRequest オブジェクトを作成
			rq = new XMLHttpRequest();
		}catch(e){}
		// Internet Explorer
		try{
			rq = new ActiveXObject('MSXML2.XMLHTTP.6.0');
		}catch(e){}
		try{
			rq = new ActiveXObject('MSXML2.XMLHTTP.3.0');
		}catch(e){}
		try{
			rq = new ActiveXObject('MSXML2.XMLHTTP');
		}catch(e){}
		if(rq == null){
			return null;
		}
		return rq;
	},
	requestObjectDisableCache: function(rq){
		//call after open request.
		//disable cache
		//http://vird2002.s8.xrea.com/javascript/XMLHttpRequest.html
		rq.setRequestHeader('Pragma', 'no-cache');				// HTTP/1.0 における汎用のヘッダフィールド
		rq.setRequestHeader('Cache-Control', 'no-cache');		// HTTP/1.1 におけるキャッシュ制御のヘッダフィールド
		rq.setRequestHeader('If-Modified-Since', 'Thu, 01 Jun 1970 00:00:00 GMT');
		
	},
	sendRequestSync: function(mode, url, data){
		//同期モード
		var q = this.createRequestObject();
		q.open(mode, url, false);
		q.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		this.requestObjectDisableCache(q);
		try {
			q.send(data);
		} catch(e){
			console.log("sendRequestSync:Network Error.\n");
			this.isEnabledNetDB = false;
			return null;
		}
		if(q.status == 0){
			console.log("ネットワークにアクセスできません。" + q.status + ":" + q.statusText);
		}else if((200 <= q.status && q.status < 300) || (q.status == 304)){
			var res = q.responseText;
			return res;
		} else{
			console.log("サーバーがエラーを返しました。" + request.status + ":" + request.statusText);
		}
		this.isEnabledNetDB = false;
		return null;
	},
	syncDB: function(){
		// MySQLと同期
		var r, a, d, t;
		if(this.root.length == 0){
			// 初回同期時は全て取得
			r = this.sendRequestSync("GET", this.syncPHPURL + "?action=getallnode", null);
		} else{
			// 差分のみを取得
			
		}
		a = r.split("\n");
		for(var i = 0, iLen = a.length; i < iLen; i++){
			try{
				d = eval(a[i]);
			} catch(e){
				console.log(i + ": " + e + "\n");
				continue;
			}
			if(d === undefined){
				continue;
			}
			t = new MemoryDBNodeTag(d[0], d[1], d[2]);
			if(t){
				this.root.push(t);
				this.nodeList.push(t);
			}
		}
		console.log(this.root);
	},
	editNode: function(ident, tid, nid, disableSync){
		// Nodeを追加し、データベースにも反映し、可能ならばネットワークにも反映させる
		// nid(nodeid)は省略可能で、省略時は新たなUUIDが自動的に付与される
		// tid(typeid)も省略可能で、省略時はNullUUIDが付与される。
		// 戻り値はMemoryDBNodeTagインスタンス
		// すでに同じnodeidのNodeが存在している場合はundefinedを返しデータベースへの変更は行われない。
		var t, s, r;
		if(!ident){
			return undefined;
		}
		if(!tid){
			tid = this.UUID_Null;
		}
		if(!nid){
			nid = this.createUUID();
		}
		// 存在確認
		t = this.getNodeFromUUID(nid);
		if(t){
			return undefined;
		}
		t = new MemoryDBNodeTag(nid, tid, ident);
		
		if(this.isEnabledNetDB){
			s = this.syncPHPURL + "?action=addnode";
			s += "&nid=" + encodeURIComponent(nid);
			s += "&tid=" + encodeURIComponent(tid);
			s += "&ident=" + encodeURIComponent(ident);
			r = this.sendRequestSync("GET", s, null);
			console.log(r);
		}
	},
	addNode: function(ident, tid, nid){
		// Nodeを追加し、データベースにも反映し、可能ならばネットワークにも反映させる
		// nid(nodeid)は省略可能で、省略時は新たなUUIDが自動的に付与される
		// tid(typeid)も省略可能で、省略時はNullUUIDが付与される。
		// 戻り値はMemoryDBNodeTagインスタンス
		// すでに同じnodeidのNodeが存在している場合はundefinedを返しデータベースへの変更は行われない。
		var t, s, r;
		if(!ident){
			return undefined;
		}
		if(!tid){
			tid = this.UUID_Null;
		}
		if(!nid){
			nid = this.createUUID();
		}
		// 存在確認
		t = this.getNodeFromUUID(nid);
		if(t){
			return undefined;
		}
		t = new MemoryDBNodeTag(nid, tid, ident);
		
		if(this.isEnabledNetDB){
			s = this.syncPHPURL + "?action=addnode";
			s += "&nid=" + encodeURIComponent(nid);
			s += "&tid=" + encodeURIComponent(tid);
			s += "&ident=" + encodeURIComponent(ident);
			r = this.sendRequestSync("GET", s, null);
			console.log(r);
		}
	},
	createUUID: function(){
		var f = this.createUUIDSub;
		return (f() + f() + "-" + f() + "-" + f() + "-" + f() + "-" + f() + f() + f());
	},
	createUUIDSub: function(){
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).toLowerCase().substring(1);
	},
	getNodeFromUUID: function(nodeid){
		return this.nodeList.isIncluded(nodeid, function(a, b){ return a.nodeid == b; });
	},
}

function MemoryDBNodeTag(nodeid, typeid, identifier){
	this.nodeid = nodeid;
	this.typeid = typeid;
	this.identifier = identifier;
	//
	
}
MemoryDBNodeTag.prototype = {

}

function MemoryDBEdgeTag(typeUUIDStr){
	this.uuid = null;
}
MemoryDBEdgeTag.prototype = {

}
