scoreD3 = (function () {
        var self = {};

        self.pagesZoneData = {}
        self.imgLoaded = false;
        var currentZone = null;

        var zoneHeight = 50;
        var imageWidth = 595;
        var imageHeight = 842;
        var zoneDragMode;

        var mouseClip = {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0
        };

        self.drawImage = function (imageUrl) {

            var data = [{
                id: "img1",
                x: 0,
                y: 0,
                w: imageWidth,
                h: imageHeight,
                href: imageUrl

            }];

            scoreD3.imgLoaded = false;
            $("#waitImg").css("visibility", "visible");
            $("#generatePartButton").css("visibility", "hidden");


            d3.select("svg").selectAll("*").remove();
            $("#imageSplitterDiv").html("");
            $("#imageSplitterDiv").css("width", "" + imageWidth + "px");
            $("#imageSplitterDiv").css("height", "" + imageHeight + "px");


            svgSplitter = d3.select("#imageSplitterDiv").append("svg").attr("width", imageWidth).attr("height", imageHeight);
            //   aDiv = svgSplitter.selectAll().data(zoneData).enter().append("svg:g").on("click", click).attr("class", "clipZone");

            imgs = svgSplitter.selectAll("image").data(data);
            imgs.enter().append("svg:image").on("click", clickImg)
                .attr("class", function (d) {
                    return "img";
                })
                .attr("xlink:href", function (d) {
                    return d.href;
                }).attr("x", 0).attr("y", 0).attr("width", imageWidth)
                .on("load", function (d) {
                    scoreD3.imgLoaded = true;
                    $("#waitImg").css("visibility", "hidden");
                });

            function clickImg() {

            }


            var drag = d3.behavior.drag().on("dragstart", function (aaa) {
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
                //   setMessage("rect :" + JSON.stringify(mouseClip));
                d3.select(".dragRect").attr("width", x - mouseClip.x1).attr("height", y - mouseClip.y1);

            }).on("dragend", function (d) {
                if (scoreD3.imgLoaded == false)
                    return;


                var label = "p" + scoreParts.currentPage + "z" + currentZoneInPage;


                var h = parseInt($("#zoneHeight").val());

                if (label && label.length > 0) {
                    mouseClip.x1 = 0;
                    mouseClip.x2 = imageWidth;
                    mouseClip.y2 = mouseClip.y1 + (h / 2);
                    mouseClip.y1 = mouseClip.y1 - (h / 2);
                    self.addZone(mouseClip, label);


                }

            });

            d3.selectAll(".img").call(drag);


            if (scoreParts.currentPage == 1)
                canDrawRect = true;

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
            }).style("z-index", 100).style("stroke", "transparent").style("fill", "transparent").attr("class", "dragRect");


        }

        self.addZone = function (clipRect, label) {
            var zoneHeight = parseInt($("#zoneHeight").val());
            zoneMargin = parseInt($("#zoneMargin").val());

            var id = label;
            zone = [{
                label: label,
                divId: id,
                x: clipRect.x1 + zoneMargin,
                y: clipRect.y1,
                width: imageWidth - (2 * zoneMargin),
                height: zoneHeight,
                page: scoreParts.currentPage,
                zoneIndex: currentZoneInPage
            }];
            self.pagesZoneData[id] = zone[0];
            currentZoneInPage++;
            self.drawZoneRect(zone);
            $("#generatePartButton").css("visibility", "visible");
        }


        self.drawZoneRect = function (zones) {
            aDiv = svgSplitter.selectAll().data(zones).enter().append("svg:g").on("click", clickZone).attr("class", "zone")
                .attr("id", function (d) {
                    return d.divId;
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
                return "translate(" + d.x + "," + (d.y) + ")";

            });


            function clickZone() {
                var event = d3.event;
                var zoneId = this.id;


                if (d3.event.altKey) {
                    if (confirm("supprimer la zone ?"))
                        self.deleteZone(zoneId);


                }
            }

            aDiv.call(d3.behavior.drag()
                .on("dragstart", function () {

                    var zoneId = this.id;
                    var zoneY = self.pagesZoneData[zoneId].y + self.pagesZoneData[zoneId].height;
                    var mouseY = d3.event.sourceEvent.offsetY;
                    if (Math.abs(zoneY - mouseY) < 20) {
                        zoneDragMode = "resize";
                        $('#imageSplitterDiv').css('cursor', 's-resize');
                    } else
                        zoneDragMode = "move";
                    $('#imageSplitterDiv').css('cursor', 'move');

                    var y = d3.event.sourceEvent.offsetY - (self.pagesZoneData[zoneId].height / 2);


                }).on("drag", function () {
                    var zoneId = this.id;
                    if (zoneDragMode == "move") {
                        var y = d3.event.sourceEvent.offsetY - (self.pagesZoneData[zoneId].height / 2);
                        var deltaY = self.pagesZoneData[zoneId].y - y;
                        if (d3.event.sourceEvent.ctrlKey) {// translate all zones of the page

                            var ok = true;
                            var index = 0;
                            do {
                                var zoneId = "p" + currentPage + "z" + index;
                                index++;
                                if (!self.pagesZoneData[zoneId]) {
                                    ok = false;
                                } else {

                                    self.pagesZoneData[zoneId].y -= deltaY;
                                    var zoneD3 = d3.select("#" + zoneId);

                                    zoneD3.attr("transform", "translate(" + self.pagesZoneData[zoneId].x + "," + self.pagesZoneData[zoneId].y + ")");
                                }
                            } while (ok)


                        }
                        else {//move only dragged zone
                            return;
                            self.pagesZoneData[zoneId].y = y;
                            var zoneD3 = d3.select(this);
                            zoneD3.attr("transform", "translate(" + self.pagesZoneData[zoneId].x + "," + y + ")");

                        }
                    }
                    else {//zoneDragMode=="resize"
                        var zoneY = self.pagesZoneData[zoneId].y + self.pagesZoneData[zoneId].height;
                        var mouseY = d3.event.sourceEvent.offsetY;
                        self.pagesZoneData[zoneId].height += (mouseY - zoneY);
                        var zoneD3 = d3.select(this);

                        zoneD3.attr("height", self.pagesZoneData[zoneId].height);
                    }
                    $('#imageSplitterDiv').css('cursor', 'default');


                }).on("dragend", function () {


                }));

        }

        self.deleteZone = function (zoneId) {
            delete self.pagesZoneData[zoneId];
            var zoneGroup = d3.select("#" + zoneId);
            zoneGroup.remove();
        }

        self.deleteZonesInpage = function (page) {
         delete self.zones[page]

        }
        self.clearAllZonesRect = function (page) {
            var zones = d3.selectAll(".zone");
            zones.remove();
        }


        self.deleteAllZones = function (zoneId) {
            self.pagesZoneData = {};
            var zones = d3.selectAll(".zone");
            zones.remove();
        }


        return self;


    }
)()