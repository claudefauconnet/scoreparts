

var ZonesChecker= (function(){
var self={}

  self.message=""
  self.checkZones=function(){
 self.message=""



    for( var pagenum in scoreParts.allPagesZones.pages){
var page =scoreParts.allPagesZones.pages[pagenum]

      if(scoreParts.allPagesZones.numberOfVoices){
var modulo=page.length%scoreParts.allPagesZones.numberOfVoices
        if(modulo!=0)
          self.addMessage(pagenum,"","bad number of zones"+page.length)
      }

      page.forEach(function(zone,zoneIndex){
        if( page.x<0)
          self.addMessage(pagenum,zoneIndex,"bad x"+zone.x)
        if( page.y<0)
          self.addMessage(pagenum,zoneIndex,"bad y"+zone.y)
      })
    }


    self.printMessage()

  }

  self.addMessage=function(page,zoneindex,message){
    self.message+="page"+page+", "+"zone"+zoneindex+" : "+message+"\n"
  }


  self.printMessage=function(){
    console.log(self.message)
  }



  return self
})()

