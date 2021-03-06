function AI_MemoryTag(typeUUIDStr){
	//保存対象
	this.uuid = null;
	this.type = typeUUIDStr;
	this.createdDate = new Date();
	
	//内部データ（保存されない）
	//this.isBootstrap = false;	//上書き警告抑制用
	
	//初期化
	this.initUUID();
}
AI_MemoryTag.prototype = {
	Type_CandidateWord: "2fba8fc1-2b9a-46e0-8ade-455c0bd30637",
	Type_Word: "d5eef85c-a796-4d04-bb72-8d45c94c5e4f",
	Type_Pattern: "8085e53e-0e99-4221-821c-057f38e35ed9",
	Type_Meaning: "dec1789a-9200-4f9b-9248-177495f47f7d",
	Type_DatabaseInfo: "4e7b3a3e-bb8c-4315-b3d0-6b25f9aead61",
	
	//http://codedehitokoto.blogspot.jp/2012/01/javascriptuuid.html
	initUUID: function(){
		if(!this.uuid){
			var f = this.initUUIDSub;
			this.uuid = f() + f() + "-" + 
						f() + "-" + 
						f() + "-" + 
						f() + "-" + 
						f() + f() + f();
		}
	},
	initUUIDSub: function(){
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).toLowerCase().substring(1);
	},
	parseToStringData: function(data){
		//uuid:type:
		var d = new Object();
		//
		d.id = this.uuid;
		d.type = this.type;
		d.cDate = this.createdDate.toUTCString();
		//
		d.data = data;
		//
		return this.parseArrayToStringSource(d);
	},
	loadFromMemoryData: function(data){
		this.uuid = data.id;
		this.type = data.type;
		this.createdDate = new Date(data.cDate);
		if(data.data){
			if(this.loadFromMemoryData != AI_MemoryTag.prototype.loadFromMemoryData){
				this.loadFromMemoryData(data.data);
			}
		}
	},
	parseArrayToStringSource: function(anArray){
		if(!anArray){
			return "null";
		}
		var srcstr = "var t=";
		srcstr += this.parseArrayToStringSourceSub(anArray);
		srcstr += ";t;";
		return srcstr;
	},
	parseArrayToStringSourceSub: function(anArray){
		if(!anArray){
			return "null";
		}
		var srcstr = "{";
		for(var k in anArray){
			var v = anArray[k];
			var t = Object.prototype.toString.call(v);
			if(v instanceof Array){
				srcstr += k + ":" + this.parseArrayToStringSourceSub(v) + ",";
			} else if(!isNaN(v) && v.toString().replace(/\s+/g, "").length > 0){
				//isNaNだけでは数値判定できないので、文字列化後の空白文字を削除した長さも検査している。
				srcstr += k + ":" + v + ",";
			} else if(t == "[object String]"){
				//文字列として変換
				srcstr += k + ":'" + v + "',";
			} else if(t == "[object Object]"){
				srcstr += k + ":" + this.parseArrayToStringSourceSub(v) + ",";
			} else{
				srcstr += k + ":undefined,";
			}
		}
		if(srcstr.charAt(srcstr.length - 1) == ","){
			//最後の余計なカンマを削除
			srcstr = srcstr.slice(0, srcstr.length - 1);
		}
		srcstr += "}";
		return srcstr;
	},
}
