// 知識表現のデータベース
// php経由でMySQLデータベースに同期する機能と
// データへのアクセスを提供する

function MemoryDB(syncPHPURL){
	// 全データ
	this.root = new Array();
	//
	this.nodeList = new Array();
	this.edgeList = new Array();
	//
	this.syncPHPURL = syncPHPURL;
	this.isEnabledNetDB = true;
	//
	this.callback_updatedNode = null;	// function(nodeInstance){};
	this.callback_updatedEdge = null;	// function(edgeInstance){};
}
MemoryDB.prototype = {
	UUID_Null: "00000000-0000-0000-0000-000000000000",
	UUID_NodeType_DecimalNumber: "e3346fd4-ac17-41c3-b3c7-e04972e5c014",
	UUID_Node_MemoryDBNetworkTimestamp: "a2560a9c-dcf7-4746-ac14-347188518cf2",
	UUID_Node_MemoryDBNetworkResponseCode: "1eeb6d3d-751f-444f-91c8-ed940e65f8bd",
	createRequestObject: function(){
		var rq = null;
		// XMLHttpRequest
		try{
			// XMLHttpRequest オブジェクトを作成
			rq = new XMLHttpRequest();
		}catch(e){}
		if(rq){
			return rq;
		}
		// Internet Explorer
		try{
			rq = new ActiveXObject('MSXML2.XMLHTTP.6.0');
		}catch(e){}
		if(rq){
			return rq;
		}
		try{
			rq = new ActiveXObject('MSXML2.XMLHTTP.3.0');
		}catch(e){}
		if(rq){
			return rq;
		}
		try{
			rq = new ActiveXObject('MSXML2.XMLHTTP');
		}catch(e){}
		if(rq){
			return rq;
		}
		return null;
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
		// 定期的に呼び出されることを想定
		this.syncDBNode();
		this.syncDBEdge();
	},
	syncDBNode: function(){
		var r, a, d;
		if(this.nodeList.length == 0){
			// 初回同期時は全て取得
			r = this.sendRequestSync("GET", this.syncPHPURL + "?action=getallnode", null);
		} else{
			// 差分のみを取得
			d = this.getNodeFromUUID(this.UUID_Node_MemoryDBNetworkTimestamp).identifier;
			r = this.sendRequestSync("GET", this.syncPHPURL + "?action=getallnodemod&t=" + d, null);
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
			this.updateNodeInternal(d[2], d[1], d[0]);
		}
	},
	syncDBEdge: function(){
		var r, a, d;
		if(this.edgeList.length == 0){
			// 初回同期時は全て取得
			r = this.sendRequestSync("GET", this.syncPHPURL + "?action=getalledge", null);
		} else{
			// 差分のみを取得
			/*
			d = this.getNodeFromUUID(this.UUID_Node_MemoryDBNetworkTimestamp).identifier;
			r = this.sendRequestSync("GET", this.syncPHPURL + "?action=getallnodemod&t=" + d, null);
			*/
			return;
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
			if(	d[0] != this.UUID_Node_MemoryDBNetworkTimestamp &&
				d[0] != this.UUID_Node_MemoryDBNetworkResponseCode){
				// edge data
				this.updateEdgeInternal(d[2], d[3], d[1], d[0]);
			} else{
				// node data
				this.updateNodeInternal(d[2], d[1], d[0]);
			}
		}
	},
	updateNode: function(ident, tid, nid){
		// 該当タグのデータを書き換え、もしくは新規作成する。
		// 可能であればネットワークに反映する
		// nid(nodeid)は省略可能で、省略時は新たなUUIDが自動的に付与される
		// tid(typeid)も省略可能で、省略時はNullUUIDが付与される。
		// identはnullもしくは空文字でもかまわない。
		// 戻り値はMemoryDBNodeTagインスタンス
		// エラー発生時はundefinedを返す。
		this.updateNodeInternal(ident, tid, nid, true);
	},
	updateNodeInternal: function(ident, tid, nid, enableSync){
		// 基本的にローカルデータのみ変更
		// enableSync == trueでネットワーク同期する
		var t, s, r;
		if(!tid){
			tid = this.UUID_Null;
		}
		if(!nid){
			nid = this.createUUID();
		}
		// 存在確認
		t = this.getNodeFromUUID(nid);
		if(t){
			// 変更
			t.typeid = tid;
			t.identifier = ident;
			if(enableSync && this.isEnabledNetDB){
				s = this.syncPHPURL + "?action=updatenode";
				s += "&nid=" + encodeURIComponent(nid);
				s += "&tid=" + encodeURIComponent(tid);
				s += "&ident=" + encodeURIComponent(ident);
				r = this.sendRequestSync("GET", s, null);
				//console.log(r);
			}
		} else{
			// 新規作成
			t = new MemoryDBNodeTag(nid, tid, ident);
			this.root.push(t);
			this.nodeList.push(t);
			if(enableSync && this.isEnabledNetDB){
				s = this.syncPHPURL + "?action=addnode";
				s += "&nid=" + encodeURIComponent(nid);
				s += "&tid=" + encodeURIComponent(tid);
				s += "&ident=" + encodeURIComponent(ident);
				r = this.sendRequestSync("GET", s, null);
				//console.log(r);
			}
		}
		if(this.callback_updatedNode){
			this.callback_updatedNode(t);
		}
	},
	updateEdge: function(nid0, nid1, tid, eid){
		// 該当タグのデータを書き換え、もしくは新規作成する。
		// 可能であればネットワークに反映する
		// eid(nodeid)は省略可能で、省略時は新たなUUIDが自動的に付与される
		// tid(typeid)も省略可能で、省略時はNullUUIDが付与される
		// 戻り値はMemoryDBEdgeTagインスタンス
		// エラー発生時はundefinedを返す。
		this.updateEdgeInternal(nid0, nid1, tid, eid, true);
	},
	updateEdgeInternal: function(nid0, nid1, tid, eid, enableSync){
		// 基本的にローカルデータのみ変更
		// enableSync == trueでネットワーク同期する
		var t, s, r;
		if(!tid){
			tid = this.UUID_Null;
		}
		if(!eid){
			eid = this.createUUID();
		}
		// 存在確認
		t = this.getEdgeFromUUID(eid);
		if(t){
			// 変更
			/*
			t.typeid = tid;
			t.identifier = ident;
			if(enableSync && this.isEnabledNetDB){
				s = this.syncPHPURL + "?action=updatenode";
				s += "&nid=" + encodeURIComponent(nid);
				s += "&tid=" + encodeURIComponent(tid);
				s += "&ident=" + encodeURIComponent(ident);
				r = this.sendRequestSync("GET", s, null);
				//console.log(r);
			}
			*/
			return;
		} else{
			// 新規作成
			t = new MemoryDBEdgeTag(eid, tid, nid0, nid1);
			this.root.push(t);
			this.edgeList.push(t);
			if(enableSync && this.isEnabledNetDB){
				s = this.syncPHPURL + "?action=addedge";
				s += "&eid=" + encodeURIComponent(eid);
				s += "&tid=" + encodeURIComponent(tid);
				s += "&nid0=" + encodeURIComponent(nid0);
				s += "&nid1=" + encodeURIComponent(nid1);
				r = this.sendRequestSync("GET", s, null);
				console.log(r);
			}
		}
		if(this.callback_updatedEdge){
			this.callback_updatedEdge(t);
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
	getEdgeFromUUID: function(edgeid){
		return this.edgeList.isIncluded(edgeid, function(a, b){ return a.edgeid == b; });
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

function MemoryDBEdgeTag(edgeid, typeid, nodeid0, nodeid1){
	this.edgeid = edgeid;
	this.typeid = typeid;
	this.nodeid0 = nodeid0;
	this.nodeid1 = nodeid1;
}
MemoryDBEdgeTag.prototype = {

}
