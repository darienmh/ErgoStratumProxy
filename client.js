const client = require('stratum-client');
const http = require('http');

jobs = [];

const Client = client({
    server: "127.0.0.1",
    port: 3032,
    worker: "KorkyMonster.testing",
    password: "x",
    autoReconnectOnError: true,
    onConnect: () => {
        console.log('Connected to server')
    },
    onClose: () => {
        console.log('Connection closed')
    },
    onError: (error) => {
        console.log('Error', error.message)
    },
    onAuthorizeSuccess: () => {
        console.log('Worker authorized')
    },
    onAuthorizeFail: () => {
        console.log('WORKER FAILED TO AUTHORIZE OH NOOOOOO')
    },
    onNewDifficulty: (newDiff) => {
        console.log('New difficulty', newDiff)
    },
    onSubscribe: (subscribeData) => {
        console.log('[Subscribe]', subscribeData)
    },
    onNewMiningWork: (newWork) => {
        console.log('[New Work]', newWork)
        // options.client.write(
        //     submitWork.replace("<worker.name>", options.worker_name)
        //         .replace("<jobID>", options.job_id)
        //         .replace("<ExtraNonce2>", options.extranonce2)
        //         .replace("<ntime>", options.ntime)
        //         .replace("<nonce>", options.nonce));
        if (newWork.wasClean) {
            while (jobs.length)
                jobs.pop()
        }
        jobs.push(newWork);
    },
    onSubmitWorkSuccess: (error, result) => {
        console.log("Yay! Our work was accepted!")
    },
    onSubmitWorkFail: (error, result) => {
        console.log("Oh no! Our work was refused because: " + error)
    },
});

const handle_mining_candidate = (request, response) => {
    response.writeHead(200, {'Content-Type': 'application/json'});
    var job = jobs[0];
    if (job) {
        var res = JSON.stringify({
            msg: job.coinb1,
            b: "<b_value>",
            extraNonce1: job.extraNonce1,
            extraNonce2Size: job.extraNonce2Size,
            height: job.prevhash
        });
        res = res.replace("\"<b_value>\"", job.nbits);
    } else {
        res = "{}";
    }
    response.write(res);
    response.end();
}

const handle_job_completed = (request, response) => {
    response.writeHead(200, {'Content-Type': 'application/json'});
    jobs.splice(0, 1)
    response.write('{"status": "OK"}');
    response.end();
}

const handle_submit_solution = (request, response) => {
    var job = jobs[0];
    if(job) {
        var data = "";
        request.on('data', function (chunk) {
            data += chunk;
        });
        request.on('end', function () {
            data = JSON.parse(data);
            var nonce = data.n;
            var extraNonce2 = nonce.substr(job.extraNonce1.length)
            Client.submit({
                "worker_name": "KorkyMonster.testing",
                "job_id": job.jobId,
                "nonce": nonce,
                "extranonce2": extraNonce2
            })
            var res = JSON.stringify({
                status: "OK",
            });
            response.write(res);
            response.end()
        });
    }else{
        response.write('{"status": "fail"}');
    }
}

const server = http.createServer((request, response) => {
    // You pass two more arguments for config and middleware
    // More details here: https://github.com/vercel/serve-handler#options
    switch (request.url) {
        case '/mining/candidate':
            handle_mining_candidate(request, response);
            break;
        case '/mining/solution':
            handle_submit_solution(request, response);
            break;
        case '/mining/job/completed':
            handle_job_completed(request, response);
    }
})

server.listen(3000, () => {
    console.log('Running at http://localhost:3000');
});

