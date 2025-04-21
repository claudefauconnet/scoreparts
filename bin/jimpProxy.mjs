
import { Jimp } from "jimp";





export async function getImage(imageFile){
    var image=await Jimp.read(imageFile)
    return image
}