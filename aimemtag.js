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
