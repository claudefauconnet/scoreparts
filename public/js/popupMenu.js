var popupMenu=(function(){

    var self={};


    self.showGraphPopupMenu = function (node, point, event) {
        if (!node) {
            return;
        }

        self.currenttarget = node;


        var html = "";
        if (true) {
            //edge
            html = '    <span class="popupMenuItem" onclick="PoaddMesaure"> Remove Edge</span>';
        } else {
            html = '    <span class="popupMenuItem" onclick="GraphController.graphActions.removeNodeFromGraph();"> Remove Node</span>';
        }


        $("#popupMenuWidgetDiv").html(html);
     //   point.x = event.x;
     //   point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };


    return self;


})()