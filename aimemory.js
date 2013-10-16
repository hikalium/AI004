function AI_Memory(env){
	this.env = env;
	
	//ルート
	this.root = new Array();
	//サブリスト
	this.candidateWordList = new Array();
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
			} else{
				t = new AI_MemoryTag();
			}
			AI_MemoryTag.prototype.loadFromMemoryData.call(t, d);
			this.appendMemoryTag(t);
		}
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
	},
	removeMemoryTagByObject: function(obj){
		this.root.removeAnObject(obj);
		this.candidateWordList.removeAnObject(obj);
	},
}
