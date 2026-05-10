function processResponse(response, error, result) {
    if (response && !response.finished) {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype');
        response.setHeader('Access-Control-Allow-Credentials', true);

        if (error) {
            if (typeof error == "object") {
                error = JSON.stringify(error, null, 2);
            }
            console.log("ERROR !!" + error);
            response.status(404).send({ERROR: error});
        } else if (!result) {
            response.status(404).send("no result");
        } else {
            if (typeof result == "string") {
                var resultObj = {result: result};
                response.send(JSON.stringify(resultObj));
            } else {
                if (result.contentType && result.data) {
                    response.setHeader('Content-type', result.contentType);
                    if (typeof result.data == "object") {
                        response.send(JSON.stringify(result.data));
                    } else {
                        response.send(result.data);
                    }
                } else {
                    response.send(result);
                }
            }
        }
    }
}

module.exports = processResponse;
