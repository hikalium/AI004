// 知識表現を保存するデータベース

function MemoryDB(){
	//ルート
	this.root = new Array();
	// タグタイプリスト（各タグのfunctionオブジェクトの配列）
	this.tagTypeList = new Array();
	/*
	//サブリスト
	this.candidateWordList = new Array();
	this.candidateWordListLastModifiedDate = new Date();
	this.candidateWordListLastCleanedDate = new Date();
	//
	this.wordList = new Array();
	this.wordListLastModifiedDate = new Date();
	//
	this.notWordList = new Array();
	this.notWordListLastModifiedDate = new Date();
	//
	this.patternList = new Array();
	//
	this.dbInfo = new AI_DatabaseInfoTag();
	*/
}
MemoryDB.prototype = {
	headerUUID: "42e11880-62b8-46ea-a1c4-481264d4440d",	// UUID_Mode_ReadMemory
	memoryDataString: function(){
		var s = "#" + this.headerUUID + "\n";
		var cl = this.root;
		var k;
		for(var i = 0, iLen = cl.length; i < iLen; i++){
			if(cl[i] instanceof AI_MemoryTag){
				k = cl[i].parseToStringData();
				if(k !== undefined){
					s += k + "\n";
				}
			}
		}
		//dbInfoタグの保存
		k = this.dbInfo.parseToStringData();
		if(k !== undefined){
			s += k + "\n";
		}
		//
		/*
		var d = new Blob([s]);
		if(d){
			m.showDownloadLink(d);
		}
		*/
		return s;
	},
	loadMemory: function(str){
		var a, t, d, m, q;
		
		// this.env.debug("Memory loading...\n");
		a = str.splitByArray(["\n"]);
		
		for(var i = 1, iLen = a.length; i < iLen; i++){
			try{
				d = eval(a[i]);
			} catch(e){
				// this.env.debug(i + ": " + e + "\n");
				continue;
			}
			if(d === undefined){
				continue;
			}
			q = d.type;
			if(q == AI_MemoryTag.prototype.Type_CandidateWord){
				t = new AI_CandidateWordTag();
			} else if(q == AI_MemoryTag.prototype.Type_Word){
				t = new AI_WordTag();
			} else if(q == AI_MemoryTag.prototype.Type_NotWord){
				t = new AI_NotWordTag();
			} else if(q == AI_MemoryTag.prototype.Type_DatabaseInfo){
				t = new AI_DatabaseInfoTag();
			} else{
				t = new AI_MemoryTag();
			}
			AI_MemoryTag.prototype.loadFromMemoryData.call(t, d);
			this.appendMemoryTag(t);
		}
		this.verifyMemoryStructure();
		this.env.debug("Memory loading done.\n" + this.root.length + " tags exist.\n");
	},
	appendMemoryTag: function(tag){
		//同じUUIDのタグがあった場合はデバッグ表示をして、追加しようとしているものに置き換える。
		//ただし、初期データに入っているものは警告を発さず上書きする。
		var s = this.root.isIncluded(tag, function(a, b){ return (a.uuid == b.uuid); });
		
		//タグに合わせて追加条件を満たしているか確認し、それぞれのサブリストに分配
		if(tag instanceof AI_CandidateWordTag){
			this.candidateWordList.push(tag);
			this.candidateWordListLastModifiedDate = new Date();
		} else if(tag instanceof AI_WordTag){
			if(this.wordList.isIncluded(tag, function(a, b){ return ((a.str == b.str) && (a !== s)); })){
				this.env.debug("appendMemoryTag: Duplicated word [" + tag.str + "].\n");
				return;
			}
			if(tag.str == undefined || tag.str.length == 0){
				this.env.debug("appendMemoryTag: Invalid word [" + tag.str + "].\n");
				return;
			}
			this.wordList.push(tag);
			this.wordListLastModifiedDate = new Date();
		} else if(tag instanceof AI_NotWordTag){
			if(this.notWordList.isIncluded(tag, function(a, b){ return ((a.str == b.str) && (a !== s)); })){
				this.env.debug("appendMemoryTag: Duplicated notWord [" + tag.str + "].\n");
				return;
			}
			if(tag.str == undefined || tag.str.length == 0){
				this.env.debug("appendMemoryTag: Invalid notWord [" + tag.str + "].\n");
				return;
			}
			this.notWordList.push(tag);
			this.notWordListLastModifiedDate = new Date();
		} else if(tag instanceof AI_PatternTag){
			this.patternList.push(tag);
		} else if(tag instanceof AI_DatabaseInfoTag){
			//データベースデータに反映させて、タグ自体は破棄する
			tag.bindDatabaseInfo(this);
			return;
		}
		
		//すでにあった重複UUIDの削除
		if(s){
			if(s.isBootstrap === undefined){
				this.env.debug("appendMemoryTag: duplicated UUID " + tag.uuid + ", overwritten.\n");
			}
			this.removeMemoryTagByObject(s);
		}
		//ルートに追加
		this.root.push(tag);
	},
	/*
	appendMemoryTagFromString: function(str){
		//retv:isAppended
		var d;
		var q;
		var t;
		try{
			d = eval(str);
		} catch(e){
			this.env.debug(""i + ": " + e + "\n");
			return false;
		}
		if(d === undefined){
			return false;
		}
		q = d.type;
		if(q == AI_MemoryTag.prototype.Type_CandidateWord){
			t = new AI_CandidateWordTag();
		} else{
			t = new AI_MemoryTag();
		}
		AI_MemoryTag.prototype.loadFromMemoryData.call(t, d);
		this.appendMemoryTag(t);
	},
	*/
	removeMemoryTagByObject: function(obj){
		this.root.removeAnObject(obj);
		if(this.candidateWordList.removeAnObject(obj)){
			this.candidateWordListLastModifiedDate = new Date();
		}
		if(this.wordList.removeAnObject(obj)){
			this.wordListLastModifiedDate = new Date();
		}
	},
	verifyMemoryStructure: function(){
		//メモリ構造検査・修復
		//単語が単語候補に残っていた場合は単語候補から削除
		for(var i = 0, iLen = this.wordList.length; i < iLen; i++){
			var w = this.wordList[i].str;
			for(var j = 0, jLen = this.candidateWordList.length; j < jLen; j++){
				if(this.candidateWordList[j].str == w){
					this.env.debug("Word duplicated in CWL. Removed.\n");
					this.removeMemoryTagByObject(this.candidateWordList[j]);
					j--;
					jLen--;
				}
			}
		}
		
		this.env.wordRecognition.cleanCandidateWordList();
		//候補リスト並べ替え
		this.env.wordRecognition.sortCandidateWordListByWordCount();
		this.env.wordRecognition.computeEachWordLevel();
		this.env.wordRecognition.sortCandidateWordListByWordLevel();
		//
		this.env.debug("Memory verifying done.\n");
	},
	getTagFromWordInNotWord: function(str){
		return this.notWordList.isIncluded(str, function(a, b){ return a.str == b; });
	},
	getUUIDFromWord: function(str){
		var t = this.wordList.isIncluded(str, function(a, b){ return a.str == b; });
		if(!t){
			return this.env.UUID_Meaning_UndefinedString;
		}
		return t.uuid;
	},
	/*
	getUUIDFromWordInNotWord: function(str){
		var t = this.getTagFromWordInNotWord(str);
		if(!t){
			return this.env.UUID_Meaning_UndefinedString;
		}
		return t.uuid;
	},
	*/
}

function MemoryDBTag(typeUUIDStr){
	//保存対象
	this.uuid = null;
	this.createdDate = new Date();
	
	//初期化
	this.initUUID();
}
AI_MemoryTag.prototype = {
	Type_CandidateWord: "2fba8fc1-2b9a-46e0-8ade-455c0bd30637",
	Type_Word: "d5eef85c-a796-4d04-bb72-8d45c94c5e4f",
	Type_Pattern: "8085e53e-0e99-4221-821c-057f38e35ed9",
	Type_Meaning: "dec1789a-9200-4f9b-9248-177495f47f7d",
	Type_DatabaseInfo: "4e7b3a3e-bb8c-4315-b3d0-6b25f9aead61",
	Type_NotWord: "505dbc8d-fa0a-4d0f-b625-d6065738f63d",
	Type_Null: "00000000-0000-0000-0000-000000000000",
	AppendType_Manual: "a2aaf202-7a6c-4dc5-b394-da9592410195",
	type: "00000000-0000-0000-0000-000000000000",
	//http://codedehitokoto.blogspot.jp/2012/01/javascriptuuid.html
	initUUID: function(){
		if(!this.uuid){
			var f = this.initUUIDSub;
			this.uuid = f() + f() + "-" + 
						f() + "-" + 
						f() + "-" + 
						f() + "-" + 
						f() + f() + f();
		}
	},
	initUUIDSub: function(){
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).toLowerCase().substring(1);
	},
	parseToStringData: function(data){
		//uuid:type:
		var d = new Object();
		//
		d.id = this.uuid;
		d.type = this.type;
		d.cDate = this.createdDate.toUTCString();
		//
		d.data = data;
		//
		return this.parseArrayToStringSource(d);
	},
	loadFromMemoryData: function(data){
		this.uuid = data.id;
		this.type = data.type;
		this.createdDate = new Date(data.cDate);
		if(data.data){
			if(this.loadFromMemoryData != AI_MemoryTag.prototype.loadFromMemoryData){
				this.loadFromMemoryData(data.data);
			}
		}
	},
	parseArrayToStringSource: function(anArray){
		if(!anArray){
			return "null";
		}
		var srcstr = "var t=";
		srcstr += this.parseArrayToStringSourceSub(anArray);
		srcstr += ";t;";
		return srcstr;
	},
	parseArrayToStringSourceSub: function(anArray){
		if(!anArray){
			return "null";
		}
		var srcstr = "{";
		for(var k in anArray){
			var v = anArray[k];
			var t = Object.prototype.toString.call(v);
			if(v instanceof Array){
				srcstr += k + ":" + this.parseArrayToStringSourceSub(v) + ",";
			} else if(!isNaN(v) && v.toString().replace(/\s+/g, "").length > 0){
				//isNaNだけでは数値判定できないので、文字列化後の空白文字を削除した長さも検査している。
				srcstr += k + ":" + v + ",";
			} else if(t == "[object String]"){
				//文字列として変換
				srcstr += k + ":'" + v + "',";
			} else if(t == "[object Object]"){
				srcstr += k + ":" + this.parseArrayToStringSourceSub(v) + ",";
			} else{
				srcstr += k + ":undefined,";
			}
		}
		if(srcstr.charAt(srcstr.length - 1) == ","){
			//最後の余計なカンマを削除
			srcstr = srcstr.slice(0, srcstr.length - 1);
		}
		srcstr += "}";
		return srcstr;
	},
}
