var Voices = (function () {

    var self = {}


    self.showVoicesDialog = function () {

        var zones = Paper.getPageZones()
        scoreParts.allPagesZones[scoreParts.currentPage] = zones
        var jstreedata = [{
            id: "voices",
            text: "voices",
            parent: "#"
        }];

        zones.forEach(function (zone, index) {

            var label=zone.voice + " <span style='font-style:italic;color:blue' id='pdfLinkDiv_" + zone.voice + "'>...</span>"
            jstreedata.push({
                id: "voice_"+zone.voice,
                text: label,
                parent: "voices",
                data: {voice: zone.voice}
            })
        })
        var options = {
            withCheckboxes: true,
            openAll: true,
            selectTreeNodeFn: Voices.onSelectVoice
        };


        var html = "<div  style='width:400px;height:700px'>" +
            "<div id='voicesTreeContainer' style='width:400px;height:600px'>" +
            " <div id='voicesTreeDiv'></div>" +
            "</div>" +
            "<button onclick='Voices.validateDialog()'>OK</button>" +
            "</div>"


        $("#mainDialogDiv").html(html)
        $("#mainDialogDiv").dialog("open")
        JstreeWidget.loadJsTree("voicesTreeDiv", jstreedata, options)


    }

    self.validateDialog = function () {
        var nodes = $('#voicesTreeDiv').jstree().get_checked(true)


        var voices = []
        nodes.forEach(function (node) {
            if (node.data && node.data.voice!==null) {
                voices.push({id: node.data.voice, label: node.data.voiceLabel || node.data.voice})
            }
        })


        async.eachSeries(voices, function (voice, callbackEachVoice) {


            var voicePagesZones = {}
            for (var pageNum in scoreParts.allPagesZones) {
                voicePagesZones[pageNum]=[]
                scoreParts.allPagesZones[pageNum].forEach(function (zone) {
                    if (zone.voice  ==voice.id) {
                        voicePagesZones[pageNum].push(zone)
                    }
                })
            }

            $("#pdfLinkDiv_" + voice.id).html("processing...");
            Proxy.generateInstrumentScore(voice.label, voicePagesZones, function (err, result) {
                if (err) {
                    return callbackEachVoice(err)
                }
                var nodes = $('#voicesTreeDiv').jstree().get_checked(true)
                nodes.forEach(function (node) {
                    if (node.data && node.data.voice == voice.id) {
                        node.data.pdfLink = result
                    }
                })
                $("#pdfLinkDiv_" + voice.id).html(" <a target='_blank' href='" + document.location.href + result + "'>télécharger</a>")
                callbackEachVoice()

            })
        }, function(err){

        })


    }

    self.onSelectVoice = function (event, obj) {
        if(obj.node.data.pdfLink){
            window.open( document.location.href + obj.node.data.pdfLink , '_blank')

            return;
        }


        if (obj.node.data) {
            var voice = prompt("voice name")
            if (voice) {
                var label=voice + " <span id='pdfLinkDiv_" + obj.node.data.voice + "'>...</span>"
                $('#voicesTreeDiv').jstree('rename_node', obj.node, label)
                obj.node.data.voiceLabel = voice
                $('#voicesTreeDiv').jstree().check_node(obj.node)
            }
        }
    }


    return self


})()