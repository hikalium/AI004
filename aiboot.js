function AI_Bootstrap(env){
	var append = function(t){ env.memory.appendMemoryTag(t); };
	var w = function(str, uuid){ return new AI_WordTag(str, uuid); };
	var t;
	
	append(w("。","b48267fb-f867-491c-a562-e5e24de389c1"));
	
	t = new AI_Job_Ask_isWord(env);
	t.addJobToStack();
}