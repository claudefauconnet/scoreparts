var Paper = (function () {
        var self = {};

        var self = {};
        self.path = null;
        self.pagesZoneData = {}
        self.imgLoaded = false;
        var currentZone = null;

      //  var zoneHeight = 50;
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
            $("#myCanvas").width(imageWidth)
            $("#myCanvas").height(imageHeight)

            imageWidth = $("#myCanvas").width()
            imageHeight = $("#myCanvas").height()
            Paper.imgLoaded = false;
            $("#waitImg").css("visibility", "visible");
            $("#generatePartButton").css("visibility", "hidden");
            var zoneHeight=parseInt($("#zoneHeight").val())


            var canvas = document.getElementById('myCanvas');
            // Create an empty project and a view for the canvas:
            paper.setup(canvas);
            self.raster = new paper.Raster(imageUrl);


            self.raster.onLoad = function () {

                var size = Paper.raster.size
                // Paper.raster.position=new paper.Point(20, 20);
                Paper.raster.position = paper.view.center;
                var canvasHeight = $("#myCanvas").height()
                var coef = canvasHeight / size.height
                scoreParts.coef = coef
                Paper.raster.scale(coef)
            };

            var tool = new paper.Tool()
            tool.onMouseDown = function (event) {


                var hitResult = paper.project.hitTest(event.point, paper.hitOptions);
                if (!hitResult || hitResult.type == "pixel") {


                    var w = $("#myCanvas").width()
                    var h = (zoneHeight / 2)
                    var rectangle = new paper.Rectangle(
                        new paper.Point(10, event.point.y - h),
                        new paper.Point(w, event.point.y + h)
                    );
                    var path = new paper.Path.Rectangle(rectangle);
                    path.fillColor = new paper.Color(0.5, 0.5, 0.3, .2);// '#e9e9ff';
                    path.selected = true;
                    self.currentPath = path
                    path.onMouseDrag = self.dragPath
                    //  path.onMouseDown = self.clickPath
                    path.data.page = scoreParts.currentPage
                    path.data.type = "zone"
                    $("#generatePartButton").css("visibility", "visible");


                } else {
                    if (event.modifiers.alt) {
                        self.isClicking = true
                        var voice = prompt("enter voice name")
                        if (voice) {
                            var text = new paper.PointText(new paper.Point(20, event.point.y));
                            text.fillColor = 'black';
                            text.content = voice;
                            text.strokeColor = '#096eac';
                            hitResult.item._data.voice = voice
                        }
                    }
                }


            }


            tool.onMouseMove=function(event){
                $("#mousePositionDiv").html(""+event.point.x+"  "+event.point.y)


            }
            self.clickPath = function (event) {
                var hitResult = paper.project.hitTest(event.point, paper.hitOptions);
                if (!hitResult || hitResult.type == "pixel") {
                    return;
                }
                event.stopPropagation()
                if (event.modifiers.alt) {
                    self.isClicking = true
                    var voice = prompt("enter voice name")
                    if (voice) {
                        var text = new paper.PointText(new paper.Point(20, event.point.y));
                        text.fillColor = 'black';
                        text.content = voice;
                        text.strokeColor = '#096eac';
                        hitResult.data.voice = voice
                    }
                }
            }

            self.dragPath = function (event) {
                var item=event.target
                if (self.isClicking) {
                    return;
                }
                self.isClicking = false
                if (event.modifiers.control) {
                    function resizeDimensions(elem, width, height) {
                        //calc scale coefficients and store current position
                        var scaleX = width / elem.bounds.width;
                        var scaleY = height / elem.bounds.height;
                        var prevPos = new paper.Point(elem.bounds.x, elem.bounds.y);
                        elem.scale(scaleX, scaleY);
                    }

                    var newHeight =item.bounds.height + event.delta.y;
                    resizeDimensions(item, self.currentPath.bounds.width, newHeight)


                } else {
                    item.position.y += event.delta.y;
                }

            }


            tool.onMouseDrag = function (event) {

            }


        }

        self.getPageZones = function () {
            paper.project.selectAll()
            var items = paper.project.selectedItems;
            var zones = []
            items.forEach(function (item) {
                if (item.data.type) {
                    zones.push({
                        x: item.bounds.x,
                        y: item.bounds.y,
                        width: item.bounds.width,
                        height: item.bounds.height,
                        page: item.data.page,
                        voice: item.data.voice
                    })
                }
            })

         return zones

        }

        self.drawZonesFromY = function (zones,zoneHeight) {



            zones.forEach(function (zoneY) {
                zoneY-=10
                var w = $("#myCanvas").width()
                var h = (zoneHeight / 2)
                var rectangle = new paper.Rectangle(
                    new paper.Point(10, zoneY*scoreParts.coef),
                    new paper.Point(w, (zoneY*scoreParts.coef) + h)
                );

                var path = new paper.Path.Rectangle(rectangle);
                path.fillColor = new paper.Color(0.5, 0.5, 0.3, .2);// '#e9e9ff';
                path.selected = true;
                self.currentPath = path
                path.onMouseDrag = self.dragPath
                //  path.onMouseDown = self.clickPath
                path.data.page = scoreParts.currentPage
                path.data.type = "zone"
                $("#generatePartButton").css("visibility", "visible");
            })
        }

        self.drawZones = function (zones,zoneHeight) {

            zones.forEach(function (zone) {
                zone.y-=10

                var rectangle = new paper.Rectangle(
                    new paper.Point(zone.x, zone.y),
                    new paper.Point(zone.width,  zone.y+zone.height)
                );

                var path = new paper.Path.Rectangle(rectangle);
                path.fillColor = new paper.Color(0.5, 0.5, 0.3, .2);// '#e9e9ff';
                path.selected = true;
                self.currentPath = path
                path.onMouseDrag = self.dragPath
                //  path.onMouseDown = self.clickPath
                path.data.page = scoreParts.currentPage
                path.data.type = "zone"
                $("#generatePartButton").css("visibility", "visible");
            })
        }

        self.deletePageZones=function(){

        }



        return self;


    }
)
()