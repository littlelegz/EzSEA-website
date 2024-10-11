const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const pino = require('pino')

var app = express();

let data = null;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'build')));

app.post("/submit", (req, res) => {
    // Retrieve JSON from the POST body 
    data = req.body;
    var error = null;
    pino.info("Received Job: ", data.job_name);

    const command = `docker run --gpus all \
          --mount type=bind,source=/home/zhaoj16_ncbi_nlm_nih_gov/EzSEA/,target=/data \
          --mount type=bind,source=/home/jiangak_ncbi_nlm_nih_gov/database/,target=/database \
          ezsea ezsea -i "${data.sequence}" --output "/data/${data.job_name}" -d "/database/GTDB" -n 1000 -f "${data.folding_program}" --treeprogram "${data.tree_program}" --asrprogram "${data.asr_program}"
          `;
    exec(command, (err, stdout, stderr) => {
        if (err) {
            error = "There was a problem initializing your job, please try again later";
            pino.error(err);
        } else {
            pino.info("Job COMPLETED:", stdout);
        }
    });
    setTimeout(function () {
        res.status(200).json({ body: "Job submitted successfully", error: error });
    }, 7000);
});

app.get("/results/:id", (req, res) => {
    const id = req.params.id;
    /* 
        Returns data of query:
        - Aligned FA of leaves
        - Aligned FA of internal nodes
        - Newick tree
        - Node.json info
        - Structure PDB
    */
    res.status(200).json(data);
});

app.get("/status/:id", (req, res) => {
    const id = req.params.id;
    const filePath = `/outputs/EzSEA_${id}/EzSEA.log`;
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            pino.error("Error reading file:", err);
            return res.status(500).json({ error: "Error reading log file. Please ensure you job ID is correct." });
        }
        const logsArray = data.split('\n');
        var status = "Running";
        if (logsArray[logsArray.length - 2].includes("Done. Goodbye!")) {
            status = "Completed";
        } else if (logsArray[logsArray.length - 2].includes("Stopping with exit code 1.")) {
            status = "Error";
        }
        return res.status(200).json({ logs: logsArray, status: status });
    });

    /* 
        Returns status of query:
        - Running
        - Completed
        - Error
    */
});

// Server listening on PORT 5000
app.listen(5000, () => {
    pino.info('Backend is listening on port 5000');
});
