include = function(relpath){
	document.write("<script type='text/javascript' src=" + relpath + " charset='UTF-8'></script>");
}
//AICore
include("./ai.js");
include("./aiext.js");
include("./aisub.js");
include("./aimemory.js");
include("./aimtbase.js");
include("./aimemtag.js");
include("./aithink.js");
include("./aiwrcgnz.js");
//ELCC
include("./elcc/elcc.js");
include("./elcc/elcexpr.js");
//WebCPU
include("./webcpu/ext.js");
include("./webcpu/api.js");
include("./webcpu/decoder.js");
include("./webcpu/memory.js");
include("./webcpu/instrbas.js");
include("./webcpu/instr.js");
include("./webcpu/webcpu.js");
include("./webcpu/const.js");
