var AI_CandidateWordTag = function(str){
	AI_CandidateWordTag.base.call(this, AI_CandidateWordTag.base.prototype.Type_CandidateWord);
	this.str = str;
	this.wordCount = 0;
	this.wordLevel = 0;
}.extend(AI_MemoryTag, {
	parseToStringData: function(){
		//uuid:type:str:wordCount:wordLevel
		var e = encodeURIComponent;
		var d = new Object();
		d.s = e(this.str);
		d.c = this.wordCount;
		d.l = this.wordLevel.toString();
		
		return AI_CandidateWordTag.base.prototype.parseToStringData.call(this, d);
	},
	loadFromMemoryData: function(data){
		var e = decodeURIComponent;
		this.str = e(data.s);
		this.wordCount = data.c;
		this.wordLevel = data.l;
	},
});

var AI_WordTag = function(str, uuid){
	AI_WordTag.base.call(this, AI_WordTag.base.prototype.Type_Word);
	if(str){
		this.str = str;
	}
	if(uuid){
		this.uuid = uuid;
	}
	this.wordCount = 0;
}.extend(AI_MemoryTag, {
	parseToStringData: function(){
		//uuid:type:str:wordCount:wordLevel
		var e = encodeURIComponent;
		var d = new Object();
		d.s = e(this.str);
		d.c = this.wordCount;
		return AI_WordTag.base.prototype.parseToStringData.call(this, d);
	},
	loadFromMemoryData: function(data){
		var e = decodeURIComponent;
		this.str = e(data.s);
		this.wordCount = data.c;
	},
});

var AI_DatabaseInfoTag = function(){
	AI_DatabaseInfoTag.base.call(this, AI_DatabaseInfoTag.base.prototype.Type_DatabaseInfo);
	this.readLineCount = 0;
}.extend(AI_MemoryTag, {
	parseToStringData: function(){
		//uuid:type:str:wordCount:wordLevel
		var d = new Object();
		d.rlc = this.readLineCount;
		return AI_DatabaseInfoTag.base.prototype.parseToStringData.call(this, d);
	},
	loadFromMemoryData: function(data){
		this.readLineCount = data.rlc;
	},
	bindDatabaseInfo: function(aimemory){
		//このインスタンスがもつ情報をAI_Memoryのデータに反映させる
		aimemory.dbInfo.readLineCount = this.readLineCount;
	},
});

var AI_PatternTag = function(pattern, uuid, func){
	AI_PatternTag.base.call(this, AI_PatternTag.base.prototype.Type_Pattern);
	// p.func(this.env, separated, separated_UUID);
	//patternには関数も指定できる。その場合、関数の形式は
	//f(separated, separated_UUID)となる。戻り値がtrueの場合、パターンはマッチしたとみなされる
	if(pattern){
		this.pattern = pattern;
	}
	if(uuid){
		this.uuid = uuid;
	}
	if(func){
		this.func = func;
	}
}.extend(AI_MemoryTag, {
	parseToStringData: function(){
		//Not implemented.
	},
});

var AI_MeaningTag = function(uuid, description){
	AI_MeaningTag.base.call(this, AI_MeaningTag.base.prototype.Type_Meaning);
	if(description){
		this.description = description;
	}
	if(uuid){
		this.uuid = uuid;
	}
}.extend(AI_MemoryTag, {
	parseToStringData: function(){
		//Not implemented.
	},
});
