scoreD3 = (function () {
    var self = {};
    var zoneHeight=50;
    self.pagesZoneData={}
    self.drawImage = function (imageUrl) {

        var data = [{
            id: "img1",
            x: 0,
            y: 0,
            w: globalWidth,
            h: globalHeight,
            // href: "http://localhost:8082/imageSplitter/images/testImg.png"
            href:  imageUrl

        }];

        // if (!svgSplitter)

        d3.select("svg").selectAll("*").remove();
        $("#imageSplitterDiv").html("");
        $("#imageSplitterDiv").css("width", "" + globalWidth + "px");
        $("#imageSplitterDiv").css("height", "" + globalHeight + "px");

        svgSplitter = d3.select("#imageSplitterDiv").append("svg").attr("width", globalWidth).attr("height", globalHeight);
        aDiv = svgSplitter.selectAll().data(zoneData).enter().append("svg:g").on("click", click).attr("class", "clipZone");

        imgs = svgSplitter.selectAll("image").data(data);
        imgs.enter().append("svg:image")  .on("click", clickImg)
            .attr("class", function (d) {
                return "img";
            })
            .attr("xlink:href", function (d) {
                return d.href;
            }).attr("x",0).attr("y",0);

       function  clickImg() {
           var x = d3.event.offsetX;
           var y = d3.event.offsetY;
           var label = "p" + scoreParts.currentPage + "z" + currentZoneInPage;


           if (label && label.length > 0) {
               mouseClip.x1 = 0;
               mouseClip.x2 = 592;
               mouseClip.y2 = y + (zoneHeight / 2);
               mouseClip.y1 = y - (zoneHeight / 2);
               self.drawZoneRect(mouseClip, "Z", label);
           }
       }


     /*   var drag = d3.behavior.drag().on("dragstart", function (aaa) {
            var x = d3.event.sourceEvent.offsetX;
            var y = d3.event.sourceEvent.offsetY;
            mouseClip.x1 = x;
            mouseClip.y1 = y;
            d3.select(".dragRect").attr("x", x).attr("y", y);
        }).on("drag", function (d) {
            var x = d3.event.sourceEvent.offsetX;
            var y = d3.event.sourceEvent.offsetY;
            mouseClip.x2 = x;
            // mouseClip.y2 = mouseClip.y1 + 5;
            mouseClip.y2 = y;
            setMessage("rect :" + JSON.stringify(mouseClip));
            d3.select(".dragRect").attr("width", x - mouseClip.x1).attr("height", y - mouseClip.y1);
        }).on("dragend", function (d) {

            var label = "p" + currentPage + "z" + currentZoneInPage;
            if( !zoneHeight){
                zoneHeight=mouseClip.y2-mouseClip.y1
            }
            if (label && label.length > 0) {
                mouseClip.x1=5;
                mouseClip.x2=590;
                mouseClip.y2= mouseClip.y1+(zoneHeight/2);
                mouseClip.y1=mouseClip.y1-(zoneHeight/2);
                self.drawZoneRect(mouseClip, "Z", label);

            }

        });

        d3.selectAll(".img").call(drag);*/
      /*  if (currentPage == 1)
            canDrawRect = true;*/

        // **************************DragRect************************

        var dataRect = [{
            x: 1,
            y: 1,
            w: 2,
            h: 2,

        }];
        dragRect = svgSplitter.selectAll().data(dataRect).enter().append("rect").attr("width", function (d) {
            return d.w;
        }).attr("height", function (d) {
            return d.h;
        }).attr("x", function (d) {
            return d.x;
        }).attr("y", function (d) {
            return d.y;
        }).style("z-index", 100).style("stroke", "black").style("fill", "transparent").attr("class", "dragRect");


    }

    self.drawZoneRect = function (clipRect, type, label) {
        var id = label;
        zoneData = [{
            label: label,
            divId: id,
            x: clipRect.x1,
            y: clipRect.y1,
            width: clipRect.x2 - clipRect.x1,
            height: clipRect.y2 - clipRect.y1
        }];
        self.pagesZoneData["p" + scoreParts.currentPage + "z" + currentZoneInPage] = zoneData[0];
        currentZoneInPage++;
        aDiv = svgSplitter.selectAll().data(zoneData).enter().append("svg:g").on("click", click).attr("class", "clipZone")
            .attr("id", function (d) {
                return id;
            }).attr("width", function (d) {
                return d.width;
            }).attr("height", function (d) {
                return d.height;
            });

        aDiv.append("rect").attr("id", function (d) {
            return "R_" + d.divId;
        }).attr("width", function (d) {
            return d.width;
        }).attr("height", function (d) {
            return d.height;
        }).style("stroke", "black").style("fill", function (d) {
            var color = "F9B154";

            return color;

        }).style("opacity", 0.5);

        aDiv.append("text").attr("id", function (d) {
            return "T_" + d.divId;
        }).attr("y", "15px").attr("x", "10px").text(function (d) {
            return d.label;
        }).style("fill", "black").attr("class", "textSmall").style("font-size", "12px");

        // aDiv.attr("x", clipRect.x1).attr("y", clipRect.y1);
        aDiv.attr("transform", function (d) {
            // d.x=-d.x/2;d.y=-d.y/2;
            return "translate(" + clipRect.x1 + "," + (clipRect.y1) + ")";

        });

        aDiv.call(d3.behavior.drag().on("dragstart", function () {

            var oldRect = self.pagesZoneData[this.id];
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


        }).on("drag", function () {
            if (isResizing) {

                var oldRect = self.pagesZoneData[this.id];

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

                oldRect = self.pagesZoneData[this.id];
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

        }).on("dragend", function () {
            console.log("Resizing end" + isResizing);
            var rect = d3.select(".dragRect");
            var newX = parseInt(rect.attr("x"));
            var newY = parseInt(rect.attr("y"));
            var newWidth = parseInt(rect.attr("width"));
            var newHeight = parseInt(rect.attr("height"));
            var zoneId = this.id
            self.pagesZoneData[zoneId].x = newX;
            self.pagesZoneData[zoneId].y = newY;
            self.pagesZoneData[zoneId].width = newWidth;
            self.pagesZoneData[zoneId].height = newHeight;
            //  var zoneD3 = d3.select("#" + this.divId);
            var zoneD3 = d3.select(this);
            var coefX = newWidth / zoneD3.attr("width");
            var coefY = newHeight / zoneD3.attr("height");
            zoneD3.attr("transform", "translate(" + newX + "," + newY + ")," + "scale(" + coefX + "," + coefY + ")");
            $('.clipZone').css('cursor', 'default');

            if (isResizing) {
                isResizing = false;
            }
        }));

    }


    return self;


})()