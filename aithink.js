function AI_Think(env){
	this.env = env;
	this.inputting = false;
}
AI_Think.prototype = {
	tick: function(){
		//定期的に呼ばれることを期待する
		if(this.inputting){
			this.env.debug("**** Think ****\n");
			for(var i = 0; i < 64; i++){
				//入力処理ループ
				var s = this.env.input.getSentence();
				if(s === undefined){
					this.inputting = false;
					
					break;
				}
				this.env.message("User> " + s + "\n", true);
			}
		}
	},
	thinkMain: function(){
		
	},
	
}
