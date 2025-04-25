var Voices = (function () {

    var self = {}


    self.getDistinctVoices=function(){
        var voices=[]
        for(var page in scoreParts.allPagesZones.pages){
            scoreParts.allPagesZones.pages[page].forEach(function(zone){
                if(voices.indexOf(zone.voice)<0)
                    voices.push(zone.voice)
            })
        }
     //  $("#voices_numberOfVoices").val(voices.length)

        return voices

    }

    self.showVoicesDialog = function () {

        var currentZones = Paper.getPageZones()
        scoreParts.allPagesZones.pages[scoreParts.currentPage] = currentZones
        var jstreedata = [{
            id: "voices",
            text: "voices",
            parent: "#"
        }];

        var voices= self.getDistinctVoices()


       self.numberOfVoices=parseInt(prompt("nombre total de voix ",voices.length))


       self.nunmberOfSystems=voices.length/self.numberOfVoices
        if(!Number.isInteger(self.nunmberOfSystems))
            return alert("mauvais nombre de voix  "+self.nunmberOfSystems)

        if(self.numberOfVoices!=voices.length) {
            voices = voices.slice(0,self.numberOfVoices);

        }




        voices.forEach(function (voice, index) {

            var label=voice + " <span style='font-style:italic;color:blue' id='pdfLinkDiv_" + voice + "'>...</span>"
            jstreedata.push({
                id: "voice_"+voice,
                text: label,
                parent: "voices",
                data: {voice: voice,index:index}
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
            "<div>" +
            "Titre pièce<input id='voices_scoreTitle' size='200px'> &nbsp;"  +
            "<button onclick='Voices.validateDialog()'>OK</button>" +
            "<number of voices <input id='voices_numberOfVoices'/>" +

            "</div>" +
            "</div>"


        $("#mainDialogDiv").html(html)
        $("#mainDialogDiv").dialog("open")


        var title=scoreParts.allPagesZones.title || scoreParts.pdfName
       $("#voices_scoreTitle").val(title)


        JstreeWidget.loadJsTree("voicesTreeDiv", jstreedata, options)


    }

    self.validateDialog = function () {
        var nodes = $('#voicesTreeDiv').jstree().get_checked(true)


        var voices = []
        nodes.forEach(function (node) {
            if (node.data && node.data.voice!==null) {
                voices.push({id: node.data.voice,index:node.data.index, label: node.data.voiceLabel || node.data.voice})
            }
        })


        async.eachSeries(voices, function (voice, callbackEachVoice) {


            var voicePagesZones = {pages:{}}

            var title=$("#voices_scoreTitle").val()
            voicePagesZones.title=title
            scoreParts.allPagesZones.title=title
            Proxy.saveZones()

            for (var pageNum in scoreParts.allPagesZones.pages) {
                voicePagesZones.pages[pageNum]=[]
                var zones=scoreParts.allPagesZones.pages[pageNum]
                zones.forEach(function (zone,index) {
                // reaffect voice  depending of number of systems in page
                        if (index % self.numberOfVoices === 0) {
                            zone=JSON.parse(JSON.stringify(zone))
                            zone.voice=zones[voice.index].voice
                        }



                    if (zone.voice  ==voice.id) {
                        voicePagesZones.pages[pageNum].push(zone)
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