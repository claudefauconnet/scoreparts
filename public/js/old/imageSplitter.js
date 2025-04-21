var svgSplitter;
var currentZone;
var globalWidth = 1000;
var globalHeight = 1400;
var currentPage = 1;
var currentZoneInPage = 0;
var aDiv;
var canDrawRect = false;
var downoladFileName = "";
var vOffset = -10;// a revoir
var isResizing = false;
var dragRect = null;

var mouseDragCurrentX = 0;
var mouseDragCurrentY = 0;

var resizeSquare = 50

var mouseClip = {
	x1 : 0,
	y1 : 0,
	x2 : 0,
	y2 : 0
};

var zoneData = [];
var pagesZoneData = {}


var payload = {
    listScores: 1,

};


function onFormSubmit(){
	var str=$("#toUploadFile").val();
	var p =str.lastIndexOf('/') ;
	if(p<0)
		p=str.lastIndexOf('\\') ;
	if(p<0)
		return false;
	var q=str.toLowerCase().lastIndexOf('.pdf') ;
	if(q<0)
		return false;
	str=str.substring(p+1,q)
	var name=prompt("nom de la partition",str);
	if(name && name.length>0){
		$("#fileName").val(name);
		$("#importButton").css("visibility","hidden");
		
		return true;
	}
	return false;
		
}

function drawImage(name) {

	var data = [ {
		id : "img1",
		x : 0,
		y : 0,
		w : globalWidth,
		h : globalHeight,
		// href: "http://localhost:8082/imageSplitter/images/testImg.png"
		href : "data/" + name + ".jpg"

	} ];

	// if (!svgSplitter)

	d3.select("svg").selectAll("*").remove();
	$("#imageSplitterDiv").html("");
	$("#imageSplitterDiv").css("width", "" + globalWidth + "px");
	$("#imageSplitterDiv").css("height", "" + globalHeight + "px");
	svgSplitter = d3.select("#imageSplitterDiv").append("svg").attr("width", globalWidth).attr("height", globalHeight);
	aDiv = svgSplitter.selectAll().data(zoneData).enter().append("svg:g").on("click", click).attr("class", "clipZone");

	imgs = svgSplitter.selectAll("image").data(data);
	imgs.enter().append("svg:image") // .on("click", click)
	.attr("class", function(d) {
		return "img";
	})
	// .attr("xlink:href",
	// "http://localhost:8082/imageSplitter/images/testImg.png")
	.attr("xlink:href", function(d) {
		return d.href;
	}).attr("width", function(d) {
		return "" + d.w + "px";
	}).attr("height", function(d) {
		return "" + d.h + "px";
	});

	var drag = d3.behavior.drag().on("dragstart", function(aaa) {
		var x = d3.event.sourceEvent.offsetX;
		var y = d3.event.sourceEvent.offsetY;
		mouseClip.x1 = x;
		mouseClip.y1 = y;
		d3.select(".dragRect").attr("x", x).attr("y", y);
	}).on("drag", function(d) {
		var x = d3.event.sourceEvent.offsetX;
		var y = d3.event.sourceEvent.offsetY;
		mouseClip.x2 = x;
		// mouseClip.y2 = mouseClip.y1 + 5;
		mouseClip.y2 = y;
		setMessage("rect :" + JSON.stringify(mouseClip));
		d3.select(".dragRect").attr("width", x - mouseClip.x1).attr("height", y - mouseClip.y1);
	}).on("dragend", function(d) {

		var label = "p" + scoreParts.currentPage + "z" + currentZoneInPage;
		if (label && label.length > 0) {

			drawZoneRect(mouseClip, "Z", label);
			/*
			 * var e = d3.event; if (!aDiv) { } else{ moveRect(mouseClip); }
			 */

		}

	});

	d3.selectAll(".img").call(drag);
	if (scoreParts.currentPage == 1)
		canDrawRect = true;

	// **************************DragRect************************

	var dataRect = [ {
		x : 1,
		y : 1,
		w : 2,
		h : 2,

	} ];
	dragRect = svgSplitter.selectAll().data(dataRect).enter().append("rect").attr("width", function(d) {
		return d.w;
	}).attr("height", function(d) {
		return d.h;
	}).attr("x", function(d) {
		return d.x;
	}).attr("y", function(d) {
		return d.y;
	}).style("z-index", 100).style("stroke", "black").style("fill", "transparent").attr("class", "dragRect");

}

// **************************DragRect************************
function drawZoneRect(clipRect, type, label) {
	

	id = label;

	zoneData = [ {
		label : label,
		divId : id,
		x : clipRect.x1,
		y : clipRect.y1,
		width : clipRect.x2 - clipRect.x1,
		height : clipRect.y2 - clipRect.y1
	} ];
	pagesZoneData["p" + scoreParts.currentPage + "z" + currentZoneInPage] = zoneData[0];
	currentZoneInPage++;
	aDiv = svgSplitter.selectAll().data(zoneData).enter().append("svg:g").on("click", click).attr("class", "clipZone")
	// .attr("class", label)
	.attr("id", function(d) {
		return id;
	}).attr("width", function(d) {
		return d.width;
	}).attr("height", function(d) {
		return d.height;
	});

	aDiv.append("rect").attr("id", function(d) {
		return "R_" + d.divId;
	}).attr("width", function(d) {
		return d.width;
	}).attr("height", function(d) {
		return d.height;
	}).style("stroke", "black").style("fill", function(d) {
		var color = "F9B154";

		return color;

	}).style("opacity", 0.5);

	aDiv.append("text").attr("id", function(d) {
		return "T_" + d.divId;
	}).attr("y", "15px").attr("x", "10px").text(function(d) {
		return d.label;
	}).style("fill", "black").attr("class", "textSmall").style("font-size", "12px");

	// aDiv.attr("x", clipRect.x1).attr("y", clipRect.y1);
	aDiv.attr("transform", function(d) {
		// d.x=-d.x/2;d.y=-d.y/2;
		return "translate(" + clipRect.x1 + "," + (clipRect.y1) + ")";

	});

	aDiv.call(d3.behavior.drag().on("dragstart", initZoneDrag).on("drag", dragZone).on("dragend", dragZoneEnd));

}

function click() {
	currentZone = this;
	var id = this.__data__.divId;
	/*
	 * svgSplitter.selectAll("#" + id).style("fill", function(d) { var color =
	 * "#ddf";
	 * 
	 * return color;
	 * 
	 * });
	 */

}

function dblclick() {

}

function initZoneDrag(zone) {

	oldRect = pagesZoneData[zone.divId];
	var oldX2 = oldRect.x + oldRect.width;
	var oldY2 = oldRect.y + oldRect.height;
	var evtX = d3.event.sourceEvent.offsetX;
	var evtY = d3.event.sourceEvent.offsetY;
	mouseDragCurrentX = evtX;
	mouseDragCurrentY = evtY;

	setMessage((oldX2 - resizeSquare) + "  :  " + (oldY2 - resizeSquare));
	if (evtX > (oldX2 - resizeSquare) && evtY > (oldY2 - resizeSquare)) {
		$('.clipZone').css('cursor', 'crosshair');
		isResizing = true;
		console.log("Resizing init" + isResizing);
	} else {
		isResizing = false;
		$('.clipZone').css('cursor', 'default');
	}

}
function dragZone(zone) {
	if (isResizing) {

		oldRect = pagesZoneData[zone.divId];

		var evtX = d3.event.sourceEvent.layerX;
		var evtY = d3.event.sourceEvent.layerY;
		// console.log(evtX+" : "+evtY);
		var newWidth = evtX - oldRect.x;
		var newHeight = evtY - oldRect.y;
		setMessage(newWidth + "  :  " + newHeight);
		var xCoef = newWidth / oldRect.width;
		var yCoef = newHeight / oldRect.height;
		d3.select(".dragRect").attr("width", newWidth).attr("height", newHeight);
		// d3.select(".dragRect").attr("transform", "translate(" + oldRect.x +
		// "," + oldRect.y + ")," + "scale(" + xCoef + "," + yCoef + ")");

	} else {

		oldRect = pagesZoneData[zone.divId];
		var oldX = parseInt(d3.select(".dragRect").attr("x"));
		var oldY = parseInt(d3.select(".dragRect").attr("y"));
		var evtX = d3.event.sourceEvent.layerX;
		var evtY = d3.event.sourceEvent.layerY;
		console.log("Resizing drag" + isResizing);
		var dx = evtX - mouseDragCurrentX;
		var dy = evtY - mouseDragCurrentY;

		var newX = oldX + dx;
		var newY = oldY + dy;
		d3.select(".dragRect").attr("x", newX).attr("y", newY);

		mouseDragCurrentX = evtX;
		mouseDragCurrentY = evtY;
	}

}

function dragZoneEnd(zone) {
	console.log("Resizing end" + isResizing);
	var rect = d3.select(".dragRect");
	var newX = parseInt(rect.attr("x"));
	var newY = parseInt(rect.attr("y"));
	var newWidth = parseInt(rect.attr("width"));
	var newHeight = parseInt(rect.attr("height"));

	pagesZoneData[zone.divId].x = newX;
	pagesZoneData[zone.divId].y = newY;
	pagesZoneData[zone.divId].width = newWidth;
	pagesZoneData[zone.divId].height = newHeight;
	var zoneD3 = d3.select("#" + zone.divId);

	var coefX = newWidth / zoneD3.attr("width");
	var coefY = newHeight / zoneD3.attr("height");
	zoneD3.attr("transform", "translate(" + newX + "," + newY + ")," + "scale(" + coefX + "," + coefY + ")");
	$('.clipZone').css('cursor', 'default');

	if (isResizing) {
		isResizing = false;
	}

}

function drawDragRect() {

}

function updateImage(link) {
	d3.select("svg").selectAll(".clipZone").remove();
	d3.selectAll(".img").attr("xlink:href", function(d) {
		return link;
	});
}

function openFile() {
	var name = $('#scoresSelect').val() ;
	$("#fileName").val(name);
	if(name=="")
		return;
	var name2=name+"1";
	drawImage(name2);
	scoreParts.currentPage = 1;
	$("#page").html("" + scoreParts.currentPage);
	$('#scrappingCommandsDiv').css('visibility', 'visible');

}
function nextPage() {
	scoreParts.currentPage += 1;
	currentZoneInPage = 0;
	if (false) {
		if (!pagesZoneData["p" + scoreParts.currentPage + "z" + currentZoneInPage]) {
			pagesZoneData["p" + scoreParts.currentPage + "z" + currentZoneInPage] = jQuery.extend({}, zoneData[0]);
		}
	}

	var name = $('#fileName').val() + (scoreParts.currentPage);
	// drawImage(name);
	updateImage("data/" + name + ".jpg");
	// drawZoneRect(mouseClip, "Z", name);
	$("#page").html("" + scoreParts.currentPage);

}
function previousPage() {
	scoreParts.currentPage -= 1;
	var name = $('#fileName').val() + (scoreParts.currentPage);
	// drawImage(name);
	updateImage("data/" + name + ".jpg");
	// drawZoneRect(mouseClip, "Z", name);
	$("#page").html("" + scoreParts.currentPage);

}

function generateInstrumentScore() {
	//setMessage(" gw :" + globalWidth + " gh :" + globalHeight + "rects :" + JSON.stringify(pagesZoneData));
	setMessage("  La partie est en cours de génération , Attendez..."," blue");
	$('body').css("cursor", "progress");
	var label = prompt("nom de la partie");
	var fileName = $('#fileName').val();
	downoladFileName = fileName + "_" + label + ".pdf";
	if (label && label.length > 0) {
		var params = {
			action : "generateInstrumentScore",
			globalWidth : globalWidth,
			globalHeight : globalHeight,
			label : label,
			fileName : fileName,
			startPage : scoreParts.currentPage
		}

		for (key in pagesZoneData) {

			if (pagesZoneData[key].y >= 0)
				params[key] = pagesZoneData[key];

		}

		$.ajax({
			method : "POST",
			url : "imageUpload",
			data : params
		}).done(function(msg) {
			console.log(msg);

			$("#resultDiv").html("<button onclick='hideResultDiv()')>Fermer</button>Privisualisation de la première page ...<button onclick='downloadScore()')>telechargez le pfd</button><BR><BR><img src='data/" + msg + "' width='" + 600 + "' />");
			$("#resultDiv").css("visibility", "visible");
			setMessage("  La partie est générée."," green");
			$('body').css('cursor', 'default');
		}).fail(function(jqXHR, textStatus) {
			alert("Request failed: " + textStatus);
			setMessage("  Erreur dans la génération de la partie."," red");
			$('body').css('cursor', 'default');
		});

	}

}
function downloadScore() {
	var url = "data/" + downoladFileName;
	
	window.open(url, downoladFileName, "height=1300");
}
function setMessage(str) {
	$("#message").html(str);
}
function hideResultDiv() {
	$("#resultDiv").css("visibility", "hidden");
}

function clearZones() {
	d3.select("svg").selectAll(".clipZone").remove();
	pagesZoneData = {};
	scoreParts.currentPage = 1;
	currentZoneInPage = 0;
}