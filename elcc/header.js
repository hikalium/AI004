include = function(relpath){
	document.write("<script type='text/javascript' src=" + relpath + " charset='UTF-8'></script>");
}
//AI004
include("./../aiext.js");
//WebCPU
include("./../webcpu/api.js");
include("./../webcpu/ext.js");
include("./../webcpu/api.js");
include("./../webcpu/decoder.js");
include("./../webcpu/memory.js");
include("./../webcpu/instrbas.js");
include("./../webcpu/instr.js");
include("./../webcpu/webcpu.js");
include("./../webcpu/const.js");
//ELCC
include("./elcc.js");
include("./elcexpr.js");

