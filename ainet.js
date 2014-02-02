function AI_NetworkManager(env){
	this.env = env;
	this.PHPExtPath = "./ainet.php";
	this.DBPHPPath = "./dbmysql.php";
}
AI_NetworkManager.prototype = {
	//from PCD2013GSCL
	//https://sourceforge.jp/projects/h58pcdgame/scm/git/GameScriptCoreLibrary/blobs/master/www/corelib/coresubc.js
	//http://hakuhin.jp/js/xmlhttprequest.html
	CreateRequestObject: function(){
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
	RequestObjectDisableCache: function(rq){
		//call after open request.
		//disable cache
		//http://vird2002.s8.xrea.com/javascript/XMLHttpRequest.html
		rq.setRequestHeader('Pragma', 'no-cache');				// HTTP/1.0 における汎用のヘッダフィールド
		rq.setRequestHeader('Cache-Control', 'no-cache');		// HTTP/1.1 におけるキャッシュ制御のヘッダフィールド
		rq.setRequestHeader('If-Modified-Since', 'Thu, 01 Jun 1970 00:00:00 GMT');
		
	},
	sendRequestSync: function(mode, url, data){
		//同期モード
		var q = this.CreateRequestObject();
		q.open(mode, url, false);
		q.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		this.RequestObjectDisableCache(q);
		try {
			q.send(data);
		} catch(e){
			this.env.debug("AI_NetworkManager:sendRequestSync:Network Error.\n");
			return null;
		}
		if(q.status == 0){
			alert("ネットワークにアクセスできません。" + q.status + ":" + q.statusText);
		}else if((200 <= q.status && q.status < 300) || (q.status == 304)){
			var res = q.responseText;
			return res;
		}else{
			alert("サーバーがエラーを返しました。" + request.status + ":" + request.statusText);
		}
		return null;
	},
	sendRequestAsync: function(mode, url, data, callback){
		//非同期モード
		//callback(res);
		var q = this.CreateRequestObject();
		var that = this;
		q.onreadystatechange = function(){
			if(q.readyState == 4){
				if(q.status == 0){
					alert("ネットワークにアクセスできません。" + q.status + ":" + q.statusText);
				}else if((200 <= q.status && q.status < 300) || (q.status == 304)){
					var res = q.responseText;
					callback(res);
				}else{
					alert("サーバーがエラーを返しました。" + request.status + ":" + request.statusText);
				}
			}
		};
		q.open(mode, url, true);
		q.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		this.RequestObjectDisableCache(q);
		q.send(data);
	},
	sendRequestThroughPHPSync: function(mode, url, data){
		var sendURL = this.PHPExtPath;
		sendURL += "?cmd=httpreq&url=";
		sendURL += encodeURIComponent(url);
		return this.sendRequestSync("GET", sendURL);
	},
	networkDBUpdate: function(){
		//Upload
		var cl = this.env.memory.root;
		var k;
		for(var i = 0, iLen = cl.length; i < iLen; i++){
			k = cl[i];
			if(k instanceof AI_MemoryTag){
				var sendURL = this.DBPHPPath;
				sendURL += "?action=add";
				sendURL += "&uuid=" + k.uuid;
				sendURL += "&typeid=" + k.type;
				sendURL += "&desc=" + (k.str ? k.str : "");
				sendURL += "&data=" + k.parseToStringData();
				var res = this.sendRequestSync("GET", sendURL);
				this.env.debug(res + "\n");
			}
		}
	},
	networkDBViewAll: function(){
		var sendURL = this.DBPHPPath;
		sendURL += "?action=viewall";
		var res = this.sendRequestSync("GET", sendURL);
		this.env.debug(res + "\n");
	},
}