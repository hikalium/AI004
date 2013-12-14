function AI_Memory(env){
	this.env = env;
	
	//ルート
	this.root = new Array();
	//サブリスト
	this.candidateWordList = new Array();
	this.wordList = new Array();
}
AI_Memory.prototype = {
	saveMemory: function(){
		var m = this.env.IOManager;
		var s = "#" + this.env.UUID_Mode_ReadMemory + "\n";
		var cl = this.root;
		for(var i = 0, iLen = cl.length; i < iLen; i++){
			if(cl[i] instanceof AI_MemoryTag){
				s += cl[i].parseToStringData() + "\n";
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
		//同じUUIDのタグがあった場合はデバッグ表示をして、新たなものに置き換える。
		var s = this.root.isIncluded(tag, function(a, b){ return (a.uuid == b.uuid); });
		if(s){
			this.env.debug("appendMemoryTag: duplicated UUID " + tag.uuid + ", overwritten.\n");
			this.removeMemoryTagByObject(s);
		}
		//ルートに追加
		this.root.push(tag);
		//タグに合わせてそれぞれのサブリストに分配
		if(tag instanceof AI_CandidateWordTag){
			this.candidateWordList.push(tag);
		}
		if(tag instanceof AI_WordTag){
			this.wordList.push(tag);
		}
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
		this.candidateWordList.removeAnObject(obj);
		this.wordList.removeAnObject(obj);
	},
	verifyMemoryStructure: function(){
		//メモリ構造検査・修復
		//単語が単語候補に残っていた場合は単語候補から削除
		for(var i = 0, iLen = this.wordList.length; i < iLen; i++){
			var w = this.wordList[i].str;
			for(var j = 0, jLen = this.candidateWordList.length; j < jLen; j++){
				if(this.candidateWordList[j].str == w){
					this.env.debug("Word duplicated in CWL. Remove.\n");
					this.removeMemoryTagByObject(this.candidateWordList[j]);
					j--;
					jLen--;
				}
			}
		}	
		this.env.debug("Memory verifying done.\n");
	}
}
