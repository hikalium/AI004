function AI_Memory(env){
	this.env = env;
	
	//ルート
	this.root = new Array();
	//サブリスト
	this.candidateWordList = new Array();
	this.candidateWordListLastModifiedDate = new Date();
	this.candidateWordListLastCleanedDate = new Date();
	//
	this.wordList = new Array();
	this.wordListLastModifiedDate = new Date();
	//
	this.patternList = new Array();
}
AI_Memory.prototype = {

	saveMemory: function(){
		var m = this.env.IOManager;
		var s = "#" + this.env.UUID_Mode_ReadMemory + "\n";
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
		var d = new Blob([s]);
		if(d){
			m.showDownloadLink(d);
		}
	},
	loadMemory: function(str){
		var a, t, d, m, q;
		
		this.env.debug("Memory loading...\n");
		a = str.splitByArray(["\n"]);
		
		for(var i = 1, iLen = a.length; i < iLen; i++){
			try{
				d = eval(a[i]);
			} catch(e){
				this.env.debug(i + ": " + e + "\n");
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
		}
		if(tag instanceof AI_WordTag){
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
		}
		if(tag instanceof AI_PatternTag){
			this.patternList.push(tag);
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
	getUUIDFromWord: function(str){
		var t = this.wordList.isIncluded(str, function(a, b){ return a.str == b; });
		if(!t){
			return this.env.UUID_Meaning_UndefinedString;
		}
		return t.uuid;
	},
}
