var AI_Job_Ask_isWord = function(env){
	AI_Job_Ask_isWord.base.call(this, env);
	this.waiting = false;
	this.currentCandidate = null;
}.extend(AI_Job, {
	tick: function(){
		//定期的に呼ばれることを期待する
		//戻り値がundefinedで処理終了
		if(!this.waiting && this.env.memory.candidateWordList.length > 0){
			this.currentCandidate = this.env.memory.candidateWordList.pop();
			this.env.memory.removeMemoryTagByObject(this.currentCandidate);
			this.env.message("「" + this.currentCandidate.str + "」は単語ですか?(y/n)\n");
			this.waiting = true;
		}
		return 0;
	},
	input: function(s){
		//ジョブが登録されているときに入力があると呼ばれる。
		//戻り値がundefinedで処理終了
		if(this.env.input.lastSentenceSourceType != "User"){
			return 0;
		}
		if(s == "y"){
			this.env.memory.appendMemoryTag(new AI_WordTag(this.currentCandidate.str));
			this.env.message(this.env.memory.wordList.length + "個目の単語を登録しました！\n");
		}
		this.waiting = false;
		this.currentCandidate = null;
		return 0;
	}
});