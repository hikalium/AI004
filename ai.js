//AI004

function AI(){
	//ブラウザチェック
	this.checkBrowser();
	//サブクラス
	this.input = new AI_Input(this);
	this.wordRecognition = new AI_WordRecognition(this);
	this.IOManager = new AI_IOManager(this);
	this.memory = new AI_Memory(this);
	this.think = new AI_Think(this);
	//出力関連
	var that = this;
	this.tickTimer = window.setInterval(function(){that.tick();}, 100);;
	this.messageBox = null;
	this.messageBoxBuffer = "";
	this.maxMessageStringLength = 0xfffff;
	this.debugBox = null;
	this.debugBoxBuffer = "";
	this.maxDebugStringLength = 0xffff;
	this.downloadBox = null;
}
AI.prototype = {
	UUID_MemoryFile: "42e11880-62b8-46ea-a1c4-481264d4440d",
	sendToAI: function(str){
		this.debug("**** Start inputting ****\n");
		
		this.debug("input:[" + str + "]\n");
		this.input.appendInput(str);
		this.think.inputting = true
		
		this.debug("**** End inputting ****\n");
	},
	sendTextFromFileToAI: function(str, name, modDate){
		this.debug("sendTextFromFileToAI: " + modDate.toLocaleString() + " [" + name + "]\n");
		if(str.indexOf(this.UUID_MemoryFile) == 0){
			//UUID_MemoryFileが先頭にあるならば、これは記憶データファイルである。
			this.debug("UUID_MemoryFile Found.\n");
			this.memory.loadMemory(str);
		} else{
			//まるごとAIへ入力してみる
			this.sendToAI(str);
		}
	},
	setMessageBoxDOMObject: function(mBoxObj){
		this.messageBox = mBoxObj;
	},
	setDebugBoxDOMObject: function(dBoxObj){
		this.debugBox = dBoxObj;
	},
	message: function(str, noPrefix){
		if(this.messageBox){
			if(!noPrefix){
				this.messageBoxBuffer += "AI> " + str;
			} else{
				this.messageBoxBuffer += str;
			}
		}
	},
	debug: function(str){
		if(this.debugBox){
			this.debugBoxBuffer += str;
		}
	},
	tick: function(){
		//思考処理
		this.think.tick();
		//表示処理
		if(this.messageBox && this.messageBoxBuffer != ""){
			//messageBox
			var str = this.messageBox.innerHTML + this.messageBoxBuffer;
			this.messageBoxBuffer = "";
			if(str.length > this.maxMessageStringLength){
				str = str.slice(str.length - (this.maxMessageStringLength >> 1));
			}
			this.messageBox.innerHTML = str;
			this.messageBox.scrollTop = this.messageBox.scrollHeight;
		}
		if(this.debugBox && this.debugBoxBuffer != ""){
			//debugBox
			var str = this.debugBox.innerHTML + this.debugBoxBuffer;
			this.debugBoxBuffer = "";
			if(str.length > this.maxDebugStringLength){
				str = str.slice(str.length - (this.maxDebugStringLength >> 1));
			}
			this.debugBox.innerHTML = str;
			this.debugBox.scrollTop = this.debugBox.scrollHeight;
		}
	},
	checkBrowser: function(){
		if(!window.File){
			this.message("System> このブラウザは記憶保存(HTML5FileAPI)に対応していません。", true);
		}
	},
}
