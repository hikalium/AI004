// ELCHNOSCompiler for AI004

//手順:
//トークン分割
//構造解析・式の逆ポーランド化
//中間バイナリ化

function ELCHNOSCompiler_CompileException(errno, infoArray, lineCount){
	this.errno = errno;
	this.infoArray = infoArray;
	this.lineCount = lineCount;
}
ELCHNOSCompiler_CompileException.prototype = {
	errorMessageList: [
		"Trap.",
		"Incompatible value attribute.",
		"Unexpected identifier.",
		"Unknown assembly language type.",
		"Invalid expression of OSECPU Binary.",
		"Binary translation error.",
	],
	getMessageString: function(){
		var s = "";
		if(!isNaN(this.lineCount)){
			s += this.lineCount + ":";
		}
		s += "Error" + this.errno.toString().toUpperCase();
		if(this.errno < 0 || this.errorMessageList.length <= this.errno){
			s += ":Unknown\n";
		} else{
			s += ":" + this.errorMessageList[this.errno] + "\n";
		}
		if(this.infoArray){
			s += "  >" + this.infoArray.toString() + "\n";
		}
		return s;
	},
}
// throw new ELCHNOSCompiler_CompileException(5, [""], this.lineCount);


function ELCHNOSCompiler(env){
	this.env = env;
	
	this.line = null;
	this.separated = null;
	this.bin = new Array();
	
	this.structure = new Array();
	this.currentStructure = this.structure;
	this.structureStack = new Array();
	
	//0はエントリポイント(main)用に予約
	this.nextLabelID = 1;
	this.integerRegisterAllocationTable = new Array();
	this.pointerRegisterAllocationTable = new Array();
}
ELCHNOSCompiler.prototype = {
	keyWordList: [
		"@asm",
		"@end",
		"//",
		"/*",
		"*/",
		"!=",
		"==",
		"+=",
		"-=",
		"*=",
		"/=",
		"<=",
		"++",
		"--",
		"\n",
		"\t",
		" ",
		"{",
		"}",
		"(",
		")",
		";",
		",",
		"[",
		"]",
		"=",
		"+",
		"-",
		"*",
		"/",
	],
	errorMessageList: [
		"Trap.",
		"Incompatible value attribute.",
		"Unexpected identifier.",
		"Unknown assembly language type.",
		"Invalid expression of OSECPU Binary.",
		"Binary translation error.",
	],
	
	Flag_Sign_Signed			: 0x00000001,
	Flag_Sign_Unsigned			: 0x00000002,
	
	compile: function(str){
		this.line = str.split("\n");
		//分割
		this.separated = str.splitByArraySeparatorSeparatedLong(this.keyWordList);
		//コメント除去
		this.compile_removeComment();
		
		//不要な文字を削除
		this.separated.removeAllObject("\t");
		this.separated.removeAllObject(" ");
		
		//メイン処理
		var currentExpression = null;
		var numValSignFlag = 0;
		var numValBits = 0;
		var pointerCount = 0;
		var lineCount = 1;
		var mode = 0;
		var o;
		var f;
			//次に期待する値を示す。
			// 0: 何が来るかわからない
			//
			//10: 変数・定数の前置属性・型・または識別子
			//11: 変数・定数の識別子またはポインタ属性
			//12: 変数・定数の後置属性・初期化式または終端記号、もしくは連続した変数宣言の区切り
			//13: 変数・定数の初期化式または終端記号、もしくは連続した変数宣言の区切り
			//14: 配列長の数値部分
			//15: 配列長指定終了の閉じ括弧
			//16: 初期化式の開始括弧もしくは値
			//17: 初期化式の値部分または終了括弧
			//18: 初期化式の区切りまたは終了括弧
			//19: 終端記号
			//
			//50: 関数名または関数属性
			//51: 引数開始括弧
			//52: 引数or引数終了括弧
			//53: 引数区切りor引数終了括弧
			//54: 関数内部開始括弧
			//
			//60: 評価式の内容または終端記号
			//
			//70: OSECPUアセンブリ直接記述モード
			//71: OSECPUアセンブリ評価式の内容または終端記号
		try{
			for(var i = 0, iLen = this.separated.length; i < iLen; i++){
				var s = this.separated[i].toLowerCase();
				
				if(s == "\n"){
					//デバッグ用行数カウント
					lineCount++;
					continue;
				//予約語
				} else if(s == "signed" && (mode == 0 || mode == 10)){
					//符号あり
					if(numValSignFlag != 0){
						throw new ELCHNOSCompiler_CompileException(1, [s], lineCount);
					}
					numValSignFlag |= this.Flag_Sign_Signed;
					mode = 10;
				} else if(s == "unsigned" && (mode == 0 || mode == 10)){
					//符号なし
					if(numValSignFlag != 0){
						throw new ELCHNOSCompiler_CompileException(1, [s], lineCount);
					}
					numValSignFlag |= this.Flag_Sign_Unsigned;
					mode = 10;
				} else if(s == "char"  && (mode == 0 || mode == 10 || mode == 11 || mode == 52)){
					//char 8bit符号あり
					numValBits = 8;
					if(mode == 0 || mode == 10 || mode == 11){
						mode = 11;
					}
				} else if(s == "int" && (mode == 0 || mode == 10 || mode == 11 || mode == 52)){
					//int 32bit符号あり
					numValBits = 32;
					if(mode == 0 || mode == 10 || mode == 11){
						mode = 11;
					}
				} else if(s == ";" && (mode == 0 || mode == 12 || mode == 13 || mode == 19 || mode == 60 || mode == 71)){
					if(mode == 12 || mode == 13 || mode == 19){
						//変数または定数の定義終了
						numValBits = 0;
						numValSignFlag = 0;
						currentExpression = null;
						mode = 0;
					} else if(mode == 60 || mode == 71){
						//評価式終端
						currentExpression = null;
						if(mode == 60){
							mode = 0;
						} else if(mode == 71){
							mode = 70;
						}
					} else{
						throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
					}
				} else if(s == "=" && (mode == 13)){
					if(mode == 13){
						//変数・定数初期化式開始
						mode = 16;
					} else{
						throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
					}
				} else if(s == "*" && (mode == 11)){
					//ポインタ属性の付加
					pointerCount++;
				} else if(s == "," && (mode == 18 || mode == 12 || mode == 13 || mode == 53)){
					if(mode == 18){
						//初期化式の区切り
						mode = 17;
					} else if(mode == 12 || mode == 13 || mode == 53){
						//連続した変数宣言の区切り
						if(mode == 12 || mode == 13){
							mode = 11;
						} else if(mode == 53){
							mode = 52;
						}
						currentExpression = null;
					} else{
						throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
					}
				//括弧系
				} else if(s == "[" && (mode == 12)){
					//配列の長さの定義開始
					mode = 14;
				} else if(s == "]" && (mode == 15)){
					//配列の長さの定義終了
					mode = 13;
				} else if(s == "{" && (mode == 16 || mode == 54)){
					if(mode == 16){
						//初期化式の開始括弧
						mode = 17;
					} else if(mode == 54){
						//54: 関数内部開始括弧
						currentExpression = null;
						mode = 0;
					} else{
						throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
					}
				} else if(s == "}" && (mode == 17 || mode == 18 || mode == 0)){
					if(mode == 17 || mode == 18){
						//初期化式の終了括弧
						mode = 19;
					} else if(mode == 0){
						if(this.structureStack.length > 0){
							this.restoreCurrentStructure();
						} else{
							throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
						}
					}
				} else if(s == "(" && (mode == 51)){
					//51: 引数開始括弧
					mode = 52;
				} else if(s == ")" && (mode == 52 || mode == 53)){
					//52: 引数or引数終了括弧
					//53: 引数区切りor引数終了括弧
					currentExpression = null;
					for(var j = 0, jLen = this.currentStructure.length; j < jLen; j++){
						//引数番号を付与
						this.currentStructure[j].argumentIndex = j;
					}
					mode = 54;
				} else if(s == "@asm" && (mode == 0)){
					i++;
					s = this.separated[i].toLowerCase();
					if(s == "osecpu"){
						mode = 70;
					} else{
						throw new ELCHNOSCompiler_CompileException(3, [s], lineCount);
					}
				} else if(s == "@end" && (mode == 70)){
					mode = 0;
				//リストにない予約語
				} else if(s == "procedure" && (mode == 0)){
					//関数宣言
					var f = new ELCHNOSCompiler_ExpressionStructure_Function(this, lineCount);
					this.currentStructure.push(f);
					this.changeCurrentStructure(f.structure);
					currentExpression = f;
					
					mode = 50;
				} else if(s == "inline" && (mode == 50)){
					currentExpression.isInline = true;
				} else if(s == "for" && (mode == 0)){
					//forループ
					i++;
					s = this.separated[i];
					if(s == "("){
						var f = new ELCHNOSCompiler_ExpressionStructure_Loop_for(this, lineCount);
						this.currentStructure.push(f);
						this.changeCurrentStructure(f.structure);
						currentExpression = f;
						//初期化式
						f.initializer = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
						i = f.initializer.readExpressionToTerminator(i, ";");
						//条件評価式
						f.conditonalExpression = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
						i = f.conditonalExpression.readExpressionToTerminator(i, ";");
						//更新式
						f.incrementalExpression = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
						i = f.incrementalExpression.readExpressionToTerminator(i, ")");
						//開始括弧
						i++;
						if(this.separated[i] != "{"){
							throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
						}
						currentExpression = null;
					} else{
						throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
					}
				} else if(s == "if" && (mode == 0)){
					//if文
					//条件評価式-?>L2
					//実行部分
					//(break->L2)
					//L2:
					i++;
					s = this.separated[i];
					if(s == "("){
						var f = new ELCHNOSCompiler_ExpressionStructure_if(this, lineCount);
						this.currentStructure.push(f);
						this.changeCurrentStructure(f.structure);
						currentExpression = f;
						//条件評価式
						f.conditonalExpression = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
						i = f.conditonalExpression.readExpressionToTerminator(i, ")");
						//開始括弧
						i++;
						if(this.separated[i] != "{"){
							throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
						}
						currentExpression = null;
					} else{
						throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
					}
				//OSECPUアセンブリ
				} else if(s == "remark" && (mode == 70)){
					//超手抜き
					var b = new ELCHNOSCompiler_ExpressionStructure_OSECPUBinary(this, lineCount);
					this.currentStructure.push(b);
					//FE	len	...
					b.bin.push(0xfe);
					//len
					i++;
					s = this.separated[i];
					if(s.length == 2){
						var len = parseInt(s, 16);
						b.bin.push(len);
					} else{
						throw new ELCHNOSCompiler_CompileException(4, [s], lineCount);
					}
					//data
					i++;
					s = this.separated[i];
					if(s.length == len * 2){
						for(var j = 0; j < len; j++){
							b.bin.push(parseInt(s.substr(j * 2, 2), 16));
						}
					} else{
						throw new ELCHNOSCompiler_CompileException(4, [s], lineCount);
					}
					//終端
					i++;
					if(this.separated[i] != ";"){
						throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
					} else{
						//この命令は定数のみで構成されているのでコンパイル済みとマークする
						b.isCompiled = true;
						b = null;
					}
				} else if(s == "call" && (mode == 70)){
					//超手抜き
					var b = new ELCHNOSCompiler_ExpressionStructure_OSECPUBinary(this, lineCount);
					this.currentStructure.push(b);
					
					//第二引数が何か確認する
					i++;
					s = this.separated[i].toLowerCase();
					if((s.indexOf("p") == 0) && s.length == 3){
						//ポインタレジスタをcall
						//新しいラベル番号をもらう
						var labelID = this.allocateLabelID();
						//PLIMM(P30, labelID)
							//03	reg0	imm32
						b.bin.push(0x03);
						b.bin.push(0x30);
						b.appendInstruction_UINT32BE(labelID);
						//PCP(P3F, Pxx)
							//1E	reg0P	reg1P
						b.bin.push(0x1e);
						b.bin.push(0x3f);
						b.bin.push(parseInt(s.substr(1),16));
						
						b.appendInstruction_LB(0x01, labelID);
						//[FE] [01] [00]
						b.bin.push(0xfe);
						b.bin.push(0x01);
						b.bin.push(0x00);
						//終端記号
						i++;
						if(this.separated[i] != ";"){
							throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
						} else{
							//この命令は定数のみで構成されているのでコンパイル済みとマークする
							b.isCompiled = true;
							b = null;
						}
					} else{
						throw new ELCHNOSCompiler_CompileException(0, [s], lineCount);
					}
				//予約語以外
				} else if(mode == 11 || mode == 52){
					//変数または定数の宣言
					//52: 引数名
					var v = new ELCHNOSCompiler_ExpressionStructure_Variable(this, lineCount);
					v.bits = numValBits;
					v.isSigned = (numValSignFlag == 0) ? false : (0 != (numValSignFlag & this.Flag_Sign_Signed));
					s = this.separated[i];
					v.isPointer = (pointerCount != 0) ? true : false;
					pointerCount = 0;
					if(s.length <= 0){
						throw new ELCHNOSCompiler_CompileException(2, [s], lineCount);
					}
					v.identifier = s;
					this.currentStructure.push(v);
					currentExpression = v;
					//mode:11->12
					//mode:52->53
					mode++;
				} else if(mode == 14){
					currentExpression.length = parseInt(s);
					mode = 15;
				} else if(mode == 17){
					//定数値のみ対応
					currentExpression.initValue.push(parseInt(s));
					mode = 18;
				} else if(mode == 50){
					//関数名
					//大文字小文字を区別
					currentExpression.identifier = this.separated[i];
					mode = 51;
				} else{
					if(mode == 0 || mode == 70 || mode == 60 || mode == 71){
						//大文字小文字を区別
						s = this.separated[i];
						if(mode == 0 || mode == 70){
							//最初の左辺だったら追加処理
							var f = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
							this.currentStructure.push(f);
							currentExpression = f;
						}
						currentExpression.pushIdentifier(s);
						if(mode == 0){
							mode = 60;
						} else if(mode == 70){
							mode = 71;
						}
					}
				}
			}
			//中間バイナリ生成
			//バックエンドコードの中間表現を出力。
			//0x00-0xff: そのまま使えるバイナリ
			//0x10000000-0x1fffffff: 未決定の仮想整数レジスタ番号
			//0x20000000-0x2fffffff: 未決定の仮想ポインタレジスタ番号
			this.errno = 5;
			
			//OSECPUフロントエンドコードヘッダ
			this.bin.push(0x05, 0xe1, 0x00);
			
			for(var i = 0, iLen = this.structure.length; i < iLen; i++){
				var b = this.structure[i].createBinary();
				if(b !== undefined){
					this.bin.push(b);
				}
			}
			this.expandBinaryString();
			this.assignRegister();
			this.bin.logAsHexByte();
			var cpu = new WebCPU();
			cpu.loadBinaryText(this.bin.stringAsHexByte());
			cpu.staticOptimize();
			console.log(cpu.createBackendBinaryString());
			this.saveBinary();
		} catch(e){
			//全エラー処理
			if(e instanceof ELCHNOSCompiler_CompileException){
				this.env.debug(e.getMessageString());
			} else{
				throw e;
			}
		}
	},
	compile_removeComment: function(){
		//コメント削除
		var commentLineStartIndex = -1;
		var commentBlockStartIndex = -1;
		var commentBlockCount = 0;
		var linesInCommentBlock = 0;
		
		for(var i = 0, iLen = this.separated.length; i < iLen; i++){
			var s = this.separated[i];
			if(commentLineStartIndex == -1){
				if(s == "//"){
					//行コメント開始
					commentLineStartIndex = i;
				}
			} else{
				if(s == "\n"){
					//行コメント終了
					var len = i - commentLineStartIndex;
					this.separated.splice(commentLineStartIndex, len);
					iLen -= len;
					i -= len;
					commentLineStartIndex = -1;
				}
			}
			if(s == "/*"){
				//ブロックコメント開始
				if(commentBlockCount == 0){
					commentBlockStartIndex = i;
				}
				commentBlockCount++;
			} else if(s == "*/"){
				//ブロックコメント終了
				commentBlockCount--;
				if(commentBlockCount == 0){
					var len = i - commentBlockStartIndex + 1;
					var padding = new Array();
					padding.push(commentBlockStartIndex);
					padding.push(len);
					for(var j = 0, jLen = linesInCommentBlock; j < jLen; j++){
						padding.push("\n");
					}
					this.separated.splice.apply(this.separated, padding);
					i -= len - linesInCommentBlock;
					iLen -= len - linesInCommentBlock;
					linesInCommentBlock = 0;
				} else if(commentBlockCount < 0){
					this.env.debug("Too many block comment closure [].\n");
					return;
				}
			} else if(commentBlockCount > 0 && s == "\n"){
				linesInCommentBlock++;
			}
		}
	},
	raiseError: function(errno, lineCount, infoArray){
		if(errno < 0 || this.errorMessageList.length <= errno){
			this.env.debug(lineCount + ":Error" + errno.toString().toUpperCase() + ":Unknown\n");
		} else{
			this.env.debug(lineCount + ":Error" + errno.toString().toUpperCase() + ":" + this.errorMessageList[errno] + "\n");
		}
		if(infoArray){
			this.env.debug("  >" + infoArray.toString() + "\n");
		}
	},
	changeCurrentStructure: function(newstructure){
		this.structureStack.push(this.currentStructure);
		this.currentStructure = newstructure;
	},
	restoreCurrentStructure: function(){
		this.currentStructure = this.structureStack.pop();
	},
	searchIdentifier: function(identifier){
		var o;
		var cf = function(aryobj, obj){ return (aryobj.identifier == obj) };
		
		o = this.currentStructure.isIncluded(identifier, cf);
		if(!o){
			for(var i = this.structureStack.length - 1; i >= 0; i--){
				o = this.structureStack[i].isIncluded(identifier, cf);
				if(o){
					break;
				}
			}
		}
		return o;
	},
	isOperator: function(s){
		return (
			s == "=" ||
			s == "+" ||
			s == "-" ||
			s == "*" ||
			s == "/" ||
			s == "!=" ||
			s == "++" ||
			s == "<" ||
			s == "(" ||
			s == ")"||
			s == "," ||
			false
		);
	},
	allocateLabelID: function(){
		this.nextLabelID++;
		return this.nextLabelID - 1;
	},
	virtualIntegerRegisterOffset: 0x10000000,
	allocateIntegerRegister: function(owner){
		//レジスタテーブルは先頭から番号の小さい順につめて格納する。
		//[regID, owner]
		//0x10000000-0x1fffffff: 未決定の仮想整数レジスタ番号
		var freeRegID = 0;
		for(var i = 0, iLen = this.integerRegisterAllocationTable.length; i < iLen; i++){
			if(this.integerRegisterAllocationTable[i][0] != i + this.virtualIntegerRegisterOffset){
				//空いているレジスタ番号を見つけた
				if(i > 0x20){
					this.integerRegisterAllocationTable.splice(i, 0, [i + this.virtualIntegerRegisterOffset, owner]);
				}
			}
		}
		if(i == iLen){
			//途中に空いているレジスタはなかったので追加
			this.integerRegisterAllocationTable.push([i + this.virtualIntegerRegisterOffset, owner]);
		}
		return i + this.virtualIntegerRegisterOffset;
	},
	freeIntegerRegister: function(regID, owner){
		for(var i = 0, iLen = this.integerRegisterAllocationTable.length; i < iLen; i++){
			if(this.integerRegisterAllocationTable[i][0] == regID){
				//レジスタ番号を見つけた
				//オーナーが一致するか確認
				if(this.integerRegisterAllocationTable[i][1] == owner){
					//一致したので解放する
					this.integerRegisterAllocationTable.splice(i, 1);
				}
				break;
			}
		}
		if(i == iLen){
			throw new ELCHNOSCompiler_CompileException(0, ["freeIntegerRegister:regID not found."], -1);
		}
	},
	virtualPointerRegisterOffset: 0x20000000,
	allocatePointerRegister: function(owner){
		//レジスタテーブルは先頭から番号の小さい順につめて格納する。
		//[regID, owner]
		//0x20000000-0x2fffffff: 未決定の仮想ポインタレジスタ番号
		var freeRegID = 0;
		for(var i = 0, iLen = this.pointerRegisterAllocationTable.length; i < iLen; i++){
			if(this.pointerRegisterAllocationTable[i][0] != i + this.virtualPointerRegisterOffset){
				//空いているレジスタ番号を見つけた
				this.pointerRegisterAllocationTable.splice(i, 0, [i + this.virtualPointerRegisterOffset, owner]);
			}
		}
		if(i == iLen){
			//途中に空いているレジスタはなかったので追加
			this.pointerRegisterAllocationTable.push([i + this.virtualPointerRegisterOffset, owner]);
		}
		return i + this.virtualPointerRegisterOffset;
	},
	freePointerRegister: function(regID, owner){
		for(var i = 0, iLen = this.pointerRegisterAllocationTable.length; i < iLen; i++){
			if(this.pointerRegisterAllocationTable[i][0] == regID){
				//レジスタ番号を見つけた
				//オーナーが一致するか確認
				if(this.pointerRegisterAllocationTable[i][1] == owner){
					//一致したので解放する
					this.pointerRegisterAllocationTable.splice(i, 1);
				}
				break;
			}
		}
		if(i == iLen){
			throw new ELCHNOSCompiler_CompileException(0, ["freePointerRegister:regID not found."], -1);
		}
	},
	freeAllRegisterOfOwner: function(owner){
		//ownerが確保しているレジスタをすべて解放する
		//IntegerRegister
		for(var i = 0, iLen = this.integerRegisterAllocationTable.length; i < iLen; i++){
			if(this.integerRegisterAllocationTable[i][1] == owner){
				//見つけた
				this.integerRegisterAllocationTable.splice(i, 1);
				iLen--;
			}
		}
		//PointerRegister
		for(var i = 0, iLen = this.pointerRegisterAllocationTable.length; i < iLen; i++){
			if(this.pointerRegisterAllocationTable[i][1] == owner){
				//見つけた
				this.pointerRegisterAllocationTable.splice(i, 1);
				iLen--;
			}
		}
	},
	expandBinaryString: function(){
		var ary = this.bin;
		var b = new Array();
		var aryStack = new Array();
		var indexStack = new Array();
		for(var i = 0; ; i++){
			if(ary[i] === undefined){
				ary = aryStack.pop();
				if(ary === undefined){
					break;
				}
				i = indexStack.pop();
			}
			if(ary[i] instanceof Array){
					aryStack.push(ary);
					indexStack.push(i + 1);
					ary = ary[i];
					i = -1;
			} else if(ary[i] !== undefined){
					b.push(ary[i]);
			}
		}
		this.bin = b;
	},
	assignRegister: function(){
		for(var i = 0, iLen = this.bin.length; i < iLen; i++){
			if(this.bin[i] > 0xff){
				if(this.virtualIntegerRegisterOffset <= this.bin[i] && this.bin[i] <= this.virtualIntegerRegisterOffset + 0x1f){
					//R00-R1fは無条件で割り当ててOK
					this.bin[i] -= this.virtualIntegerRegisterOffset;
				} else if(this.virtualPointerRegisterOffset <= this.bin[i] && this.bin[i] <= this.virtualPointerRegisterOffset + 0x1f - 1){
					//P01-P1fは無条件で割り当ててOK
					this.bin[i] -= this.virtualPointerRegisterOffset;
					this.bin[i] += 1;
				} else{
					throw new ELCHNOSCompiler_CompileException(0, ["Sorry, but no more register."]);
				}
			}
		}
	},
	saveBinary: function(){
		var m = this.env.IOManager;
		var cl = this.bin;
		var v = new Uint8Array(this.bin);
		var d = new Blob([v]);
		if(d){
			m.showDownloadLink(d);
		}
	},
	
}

