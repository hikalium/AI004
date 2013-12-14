function AI_Job(env){
	this.env = env;
}
AI_Job.prototype = {
	tick: function(){
		//定期的に呼ばれることを期待する
		//戻り値がundefinedで処理終了
	},
	input: function(s){
		//ジョブが登録されているときに入力があると呼ばれる。
		//戻り値がundefinedで処理終了
	},
	addJobToStack: function(){
		this.env.think.jobStack.push(this);
	},
	/*
	dequeueJob(): function(){
	
	},
	*/
}
