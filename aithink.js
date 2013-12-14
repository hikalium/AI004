function AI_Think(env){
	this.env = env;
	this.inputting = false;
	this.jobStack = new Array();
	this.processingJob = null;
}
AI_Think.prototype = {
	tickLimitMs: 100,
	tick: function(){
		//定期的に呼ばれることを期待する
		if(this.inputting){
			var tickStartTimeMs = new Date();
			this.env.debug("**** Think ****\n");
			for(var i = 0; i < 64; i++){
				if((new Date()) - tickStartTimeMs > this.tickLimitMs){
					//CPU時間占有防止
					break;
				}
				//入力処理ループ
				var s = this.env.input.getSentence();
				if(s === undefined){
					this.inputting = false;
					//単語候補をソート
					this.env.wordRecognition.sortCandidateWordListByWordCount();
					this.env.wordRecognition.computeEachWordLevel();
					this.env.wordRecognition.sortCandidateWordListByWordLevel();
					break;
				}
				if(this.env.input.lastSentenceSourceType){
					this.env.message(this.env.input.lastSentenceSourceType, true);
				} else{
					this.env.message("Unknown", true);
				}
				this.env.message("> " + s + "\n", true);
				
				if(this.processingJob && this.processingJob.input(s) === undefined){
					this.processingJob = null;
				}
			}
		} else if(this.processingJob || this.jobStack.length > 0){
			if(!this.processingJob){
				this.processingJob = this.jobStack.pop();
			}
			if(this.processingJob.tick() === undefined){
				this.processingJob = null;
			}
		}
	},
}
