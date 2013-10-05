var AI_CandidateWordTag = function(str){
	AI_CandidateWordTag.base.call(this, AI_CandidateWordTag.base.prototype.Type_CandidateWord);
	this.str = str;
	this.wordCount = 0;
	this.wordLevel = 0;
}.extend(AI_MemoryTag, {
	parseToStringData: function(){
		//uuid:type:str:wordCount:wordLevel
		var e = this.escapeForMemory;
		var d = new Object();
		d.s = this.str;
		d.c = this.wordCount;
		d.l = this.wordLevel.toString();
		
		return AI_CandidateWordTag.base.prototype.parseToStringData.call(this, d);
	},
	loadFromMemoryData: function(data){
		this.str = data.s;
		this.wordCount = data.c;
		this.wordLevel = data.l;
	},
});

var AI_WordTag = function(str){
	AI_WordTag.base.call(this, AI_WordTag.base.prototype.Type_Word);
	this.str = str;
	this.wordCount = 0;
}.extend(AI_MemoryTag, {
	parseToStringData: function(){
		//uuid:type:str:wordCount:wordLevel
		var e = this.escapeForMemory;
		var d = new Object();
		d.s = this.str;
		d.c = this.wordCount;
		return AI_WordTag.base.prototype.parseToStringData.call(this) + e(this.parseArrayToStringSource(d));
	},
	loadFromMemoryData: function(data){
		this.str = data.s;
		this.wordCount = data.c;
	},
});
