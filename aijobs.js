var AI_Job_Ask_isWord = function(env){
	AI_Job_Ask_isWord.base.call(this, env);
	this.waiting = false;
	this.currentCandidate = null;
	this.isPromptedByUser = false;
}.extend(AI_Job, {
	//ユーザーが空入力をすると、候補単語が単語であるかどうかをユーザーに問いかける。
	tick: function(){
		//定期的に呼ばれることを期待する
		//戻り値がundefinedで処理終了
		if(!this.waiting && this.env.memory.candidateWordList.length > 0 && this.isPromptedByUser){
			this.currentCandidate = this.env.memory.candidateWordList.pop();
			this.env.memory.removeMemoryTagByObject(this.currentCandidate);
			this.env.message("「" + this.currentCandidate.str + "」は単語ですか?(y/n)\n");
			this.waiting = true;
			this.isPromptedByUser = false;
		}
		return 0;
	},
	input: function(s){
		//ジョブが登録されているときに入力があると呼ばれる。
		//戻り値がundefinedで処理終了
		if(this.env.input.lastSentenceSourceType != "User"){
			return 0;
		}
		if(this.waiting == false){
			if(s == ""){
				this.isPromptedByUser = true;
			}
		} else{
			if(s == "y"){
				this.env.memory.appendMemoryTag(new AI_WordTag(this.currentCandidate.str));
				this.env.message(this.env.memory.wordList.length + "個目の単語を登録しました！\n");
			}
			this.waiting = false;
			this.currentCandidate = null;
		}
		return 0;
	}
});