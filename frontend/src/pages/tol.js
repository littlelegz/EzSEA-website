import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pt from 'phylotree';
import { isLeafNode, getRootNode } from 'phylotree/src/nodes';
import { addCustomMenu } from 'phylotree/src/render/menus';
import { selectAllDescendants } from 'phylotree/src/nodes';
import Navbar from "../components/navbar";
import "../components/phylotree.css";
import "../components/tol.css";
import MolstarViewer from "../components/molstar";
import LogoStack from '../components/logo-stack';
import { readFastaToDict, parseNodeData } from '../components/utils';
import { useParams } from 'react-router-dom';
import * as d3 from 'd3';

const logoFiles = {};

const Tol = () => {
    const { jobId } = useParams();
    // State to store the tree data and node data
    const [faData, setFaData] = useState(null);
    const [newickData, setNewickData] = useState(null);
    const [nodeData, setnodeData] = useState(null);
    const [topNodes, setTopNodes] = useState({}); // Top 10 nodes for the tree

    // State to store the logo content (formatted for logoJS) and color file
    const [logoContent, setLogoContent] = useState({});
    const [colorFile, setColorFile] = useState(null);
    const [selectedNodes, setSelectedNodes] = useState([]); // Important, keeps track of user selected nodes for comparison

    // Toggle between radial and linear layout
    const [isRadial, setIsRadial] = useState(true);

    // For live updates linking sequence logo and structure viewer
    const [selectedResidue, setSelectedResidue] = useState(null);
    const [hoveredResidue, setHoveredResidue] = useState(null); // Currently not in use

    // States for rendering control
    const [pipVisible, setPipVisible] = useState(false);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);

    // References for rendering
    const treeRef = useRef(null);
    const pvdiv = useRef(null);
    const logoStackRef = useRef(null);

    // Storing tree reference itself
    const [treeObj, setTreeObj] = useState(null);

    // Fetch the tree data and node data on component mount, store data into states
    // TODO: Fetch dynamically from the backend
    useEffect(() => {
        const fetchDefaultTree = async () => {
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/example_2/Visualization/asr.tree`);
                const text = await response.text();
                setNewickData(text);
            } catch (error) {
                console.error("Error fetching the default tree:", error);
            }
        };

        fetchDefaultTree();

        readFastaToDict(`${process.env.PUBLIC_URL}/example_2/Visualization/asr.fa`).then(data => { setFaData(data) });



        fetch(`${process.env.PUBLIC_URL}/example_2/Visualization/nodes.json`)
            .then(response => response.json())
            .then((json) => {
                parseNodeData(json.slice(0, 10)).then((parsedData) => setTopNodes(parsedData));
                parseNodeData(json).then((parsedData) => setnodeData(parsedData));
            });
    }, []);

    // Deals with tree rendering
    useEffect(() => {
        if (treeRef.current && newickData) {
            treeRef.current.innerHTML = '';

            const tree = new pt.phylotree(newickData);
            setTreeObj(tree);

            function style_nodes(element, node_data) {
                var node_label = element.select("text");

                if (!isLeafNode(node_data)) { // edits to the internal nodes
                    node_label.text("\u00A0\u00A0\u00A0\u00A0" + node_label.text() + "\u00A0\u00A0\u00A0\u00A0")
                        .style("font-weight", "bold")
                        .style("font-size", "10px");

                    if (topNodes && node_data.data.name in topNodes) { // First condition to ensure nodeData is populated
                        element.select("circle").style("fill", "green");
                    }

                    // Unaligning the internal nodes
                    const currentTransform = node_label.attr("transform");
                    const translateRegex = /translate \(([^)]+)\)/;
                    let newTransform = currentTransform.replace(translateRegex, `translate(0, 0)`);
                    node_label.attr("transform", newTransform);
                    // Deleting the line tracer
                    element.select("line").remove();

                    function compareMenuCondition(node) {
                        if (node['compare-node']) {
                            return "Remove from compare";
                        }
                        return "Compare ancestral state";
                    }

                    function showMenuOpt(node) {
                        return true;
                    }

                    function compare(node, el) {
                        // change color of circle to red
                        if (node['compare-node']) {
                            el.select("circle").remove();
                            node['compare-descendants'] = false;
                        } else {
                            el.insert("circle", ":first-child").attr("r", 5).style("fill", "red");
                        }
                        node['compare-node'] = !node['compare-node'];

                        console.log("Current logo content: ", logoContent);

                        // Add node to logoContent, if already in list, remove it
                        // Check if node is already selected
                        setLogoContent(prevLogoContent => {
                            const updatedLogoContent = { ...prevLogoContent };

                            // Add or remove node from logoContent
                            if (node.data.name in updatedLogoContent) {
                                delete updatedLogoContent[node.data.name];  // Remove the node
                            } else {
                                updatedLogoContent[node.data.name] = `>${node.data.name}\n${faData[node.data.name]}`;  // Add the node
                            }

                            // Adjust layout and show PIP if there's any content
                            if (Object.keys(updatedLogoContent).length > 0) {
                                treeRef.current.style.width = '50%';
                                setIsRightCollapsed(false);
                                setPipVisible(true);
                            } else {
                                treeRef.current.style.width = '100%';
                                setPipVisible(false);
                            }

                            return updatedLogoContent;  // Return the new state
                        });

                    }

                    function compareDescMenuCondition(node) {
                        if (node['compare-descendants']) {
                            return "Remove descendants";
                        } else {
                            return "Compare descendants";
                        }
                    }

                    function compareDescendants(node, el) {
                        // change color of circle to yellow
                        if (node['compare-descendants']) {
                            el.select("circle").remove();
                        } else {
                            el.insert("circle", ":first-child").attr("r", 5).style("fill", "yellow");
                        }
                        node['compare-descendants'] = !node['compare-descendants'];
                        node['compare-node'] = !node['compare-node'];

                        console.log("Current logo content: ", logoContent);

                        // Add node to logoContent, if already in list, remove it
                        // Check if node is already selected
                        setLogoContent(prevLogoContent => {
                            const updatedLogoContent = { ...prevLogoContent };

                            // Add or remove node from logoContent
                            if (node.data.name in updatedLogoContent) {
                                delete updatedLogoContent[node.data.name];  // Remove the node
                            } else {
                                var descendants = selectAllDescendants(node, false, true);
                                var desc_fa = "";
                                for (var desc of descendants) {
                                    desc_fa += `>${desc.data.name}\n${faData[desc.data.name]}\n`;
                                }
                                updatedLogoContent[node.data.name] = desc_fa;  // Add the node
                            }

                            // Adjust layout and show PIP if there's any content
                            if (Object.keys(updatedLogoContent).length > 0) {
                                treeRef.current.style.width = '50%';
                                setIsRightCollapsed(false);
                                setPipVisible(true);
                            } else {
                                treeRef.current.style.width = '100%';
                                setPipVisible(false);
                            }

                            return updatedLogoContent;  // Return the new state
                        });
                    }

                    function showDescMenuOpt(node) {
                        if (node['compare-descendants'] || node['compare-node']) {
                            return false;
                        }
                        return true;
                    }

                    // Toggling selection options causes this code to run in duplicate. Patchy fix

                    if (!node_data['menu_items'] || node_data['menu_items'].length != 2) {
                        // Adding my custom menu
                        addCustomMenu(node_data, compareMenuCondition, function () {
                            compare(node_data, element);
                        }, showMenuOpt);

                        addCustomMenu(node_data, compareDescMenuCondition, function () {
                            compareDescendants(node_data, element);
                        }, showDescMenuOpt);
                    }
                } else { // edits to the leaf nodes

                }
            }

            function style_edges(element, edge_data) {
                try {
                    element.on('click', async (event, branch) => {
                        if (branch.selected) {
                            branch.selected = false;
                            event.target.classList.remove('branch-selected');
                            clearRightPanel();
                        } else {
                            // Remove all previous highlighted branches
                            d3.selectAll('.branch-selected').classed('branch-selected', false);
                            // Remove all previous selected nodes
                            branch.selected = true;
                            event.target.classList.add('branch-selected');
                            setLogoContent({});

                            var source = branch.source.data.name;
                            var target = branch.target.data.name;
                            console.log("Selected branch:", source, target);
                            if (!faData[source] || !faData[target]) { // TODO Is this necessary?
                                console.log("Not Found", faData[source], faData[target]);
                                clearRightPanel();
                                return;
                            } else { // Send node data to generate logos and o
                                var data = {
                                    [source]: `>${source}\n${faData[source]}`, // LogoJS parser expects header before sequence
                                    [target]: `>${target}\n${faData[target]}`,
                                }
                                treeRef.current.style.width = '50%'; // Need to have all these states as a toggle
                                setColorFile(`${source}_${target}.color.txt`);
                                setLogoContent(data);
                                setIsRightCollapsed(false);
                                setPipVisible(true);
                                console.log(logoContent);
                            }
                        }
                    });
                } catch (error) {
                    // Select all descendent branches triggers this error
                    // console.error("Error styling edges:", error);
                }


            }


            tree.render({
                'container': "#tree_container",
                'is-radial': true,
                'selectable': true,
                'zoom': true,
                'align-tips': true,
                'internal-names': true,
                width: 1000,
                height: 2000,
                'top-bottom-spacing': 'fixed-step',
                'left-right-spacing': 'fixed-step',
                'brush': false,
                'draw-size-bubbles': false, // Must be false so that nodes are clickable?
                'bubble-styler': d => { return 1.5 },
                'node-styler': style_nodes,
                'edge-styler': style_edges,
                'show-scale': false,
                'font-size': 4,
                'background-color': 'lightblue',
                'collapsible': true,
                'reroot': true,
                'hide': false, // Causes weird rendering in radial
            });

            // console.log(tree.getNodes());

            treeRef.current.appendChild(tree.display.show());
        }
    }, [newickData, isLeftCollapsed, isRadial, faData]);

    useEffect(() => {
        if (Object.keys(logoContent).length == 0) {
            setPipVisible(false);
        } else {
            setPipVisible(true);
        }
    }, [logoContent]);

    const setLogoCallback = useCallback((node) => {
        if (node !== null) {
            const handleMouseEnter = () => {
                console.log("Mouse entered logo div");
                node.style.height = '500px';
                pvdiv.current.style.height = 'calc(100% - 504px)';
            };

            node.addEventListener('mouseenter', handleMouseEnter);
        }
    }, []);

    const setPvdivCallback = useCallback((node) => {
        if (node !== null) {
            const handleMouseEnter = () => {
                console.log("Mouse entered pv div");
                node.style.height = 'calc(100% - 250px)';
                logoStackRef.current.style.height = '250px';
            };

            node.addEventListener('mouseenter', handleMouseEnter);
        }
    }, []);

    const handleColumnClick = (index) => {
        setSelectedResidue(index + 1);
    };

    function clearRightPanel() {
        setPipVisible(false);
        setSelectedResidue(null);
        setIsLeftCollapsed(false);
        setIsRightCollapsed(false);
        setColorFile(null);
        setLogoContent({});
        var desc = selectAllDescendants(treeObj.getNodes(), false, true);
        // Map set node-compare to false over desc
        desc.forEach(node => {
            node['compare-node'] = false;
        });
        d3.selectAll('.internal-node') // Remove the first circle if two are present in internal nodes
            .each(function () {
                const circles = d3.select(this).selectAll('circle');
                if (circles.size() === 2) {
                    circles.filter(function (d, i) {
                        return i === 0; // Target the first circle when there are two
                    }).remove();
                }
            });
        d3.selectAll('.branch-selected').classed('branch-selected', false);
        treeRef.current.style.width = '100%';
    }

    const handleColumnHover = (index) => {
        console.log("Column hovered:", index);
        setHoveredResidue(index + 1);
    };

    const handleNodeRemove = (index) => {
        // Remove node from logoContent
        const newLogoContent = { ...logoContent };
        const keys = Object.keys(newLogoContent);
        delete newLogoContent[keys[index]];
        setLogoContent(newLogoContent);

        // Below syncs highlights on TOL with remove action in logo stack
        d3.selectAll('.internal-node')
            .each(function () {
                var node = d3.select(this).data()[0];
                if (node.data.name === keys[index]) {
                    node['compare-node'] = false;
                    node['compare-descendants'] = false;
                    d3.select(this).select('circle').remove();  // Remove the circle
                }
            });
    }

    const selectNode = (nodeId) => {
        if (nodeId in logoContent) { // If already selected, do nothing
            return;
        }
        d3.selectAll('.internal-node')
            .each(function () {
                var node = d3.select(this).data()[0];
                if (node.data.name === nodeId) {
                    node['compare-node'] = true;

                    // Add to logoContent
                    setLogoContent(prevLogoContent => {
                        const updatedLogoContent = { ...prevLogoContent };
                        updatedLogoContent[node.data.name] = `>${node.data.name}\n${faData[node.data.name]}`;
                        return updatedLogoContent;
                    });

                    const circles = d3.select(this).selectAll('circle'); // Highlight/Rehighlight Node
                    if (circles.size() === 2) {
                        circles.filter(function (d, i) {
                            return i === 0; // Target the first circle when there are two
                        }).remove();
                    }

                    d3.select(this).insert("circle", ":first-child").attr("r", 5).style("fill", "red");
                }
            });
    }

    const toggleLeftCollapse = () => {
        setIsLeftCollapsed(!isLeftCollapsed);
    };

    const toggleRightCollapse = () => {
        console.log("Toggling right collapse");
        setIsRightCollapsed(!isRightCollapsed);
        isRightCollapsed ? setPipVisible(true) : setPipVisible(false);
    };

    const handleDownload = (filename, content) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        document.body.removeChild(element);
    };

    const downloadNewickData = () => {
        handleDownload('tree_data.nwk', newickData);
    };

    const downloadLogoFile = (fileName) => {
        const logoFileContent = JSON.stringify(logoFiles[fileName], null, 2); // Formatting as JSON
        handleDownload(`${fileName}.json`, logoFileContent);
    };

    const downloadsDropdown = () => (
        <div className="dropdown">
            <button className="dropbtn">Download Files</button>
            <div className="dropdown-content" style={{zIndex: "2"}}>
                <button onClick={downloadNewickData}>Download Newick Data</button>
                {Object.keys(logoFiles).map(fileName => (
                    <button key={fileName} onClick={() => downloadLogoFile(fileName)}>
                        Download {fileName} Logo File
                    </button>
                ))}
            </div>
        </div>
    );

    const importantNodesDropdown = () => (
        <div className="dropdown" >
            <button className="dropbtn">Important Nodes</button>
            <div className="dropdown-content" style={{zIndex: "2"}}>
                {Object.keys(topNodes).map(key => (
                    <button key={key} onClick={() => selectNode(key)}>
                        {key} Score: {topNodes[key]['score']}
                    </button>
                ))}
            </div>
        </div>
    )

    const downloadTreeAsSVG = () => {
        const svgElement = treeRef.current.querySelector('svg'); // Select the SVG from the tree container
        if (!svgElement) {
            console.error("SVG element not found in treeRef.");
            return;
        }

        // Serialize the SVG content
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);

        // Manually styling the SVG content. TODO: Maybe grab the styles from the CSS file?
        const styleString = `
            <style>
                .branch {
                    fill: none;
                    stroke: #999;
                    stroke-width: 2px;
                }
                .internal-node circle {
                    fill: #CCC;
                    stroke: black;
                    stroke-width: 0.5px;
                }
                .node {
                    font: 10px sans-serif;
                }
            </style>`;

        // Ensure that we are not redefining the xmlns attribute
        if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
            source = source.replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg"`);
        }

        // Insert the style string into the SVG just before the closing tag
        source = source.replace('</svg>', `${styleString}</svg>`);

        // Create a Blob and trigger the download
        const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);

        // Create a download link and trigger the download
        const downloadLink = document.createElement("a");
        downloadLink.href = svgUrl;
        downloadLink.download = "tree_with_styles.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <div>
            <Navbar pageId={"Integrated Tree Viewer"} />
            <div className="btn-toolbar" style={{ display: "flex", justifyContent: "space-between" }}>
                <p>Results of job: {jobId}</p>
                <span>
                    {downloadsDropdown()}
                    {importantNodesDropdown()}
                </span>
            </div>
            <div style={{ display: 'flex', height: '90vh', margin: '0 20px' }}>
                {!isLeftCollapsed && (
                    <div
                        id="tree_container"
                        className="tree-div"
                        ref={treeRef}
                        style={{ width: pipVisible ? '50%' : '100%' }}
                    ></div>
                )}

                {Object.keys(logoContent).length > 0 && (
                    <div className="center-console">
                        {!isRightCollapsed && (
                            <button className="triangle-button" onClick={toggleLeftCollapse}>
                                {isLeftCollapsed ? '▶' : '◀'}
                            </button>
                        )}
                        {!isLeftCollapsed && (
                            <button className="triangle-button" onClick={toggleRightCollapse}>
                                {isRightCollapsed ? '◀' : '▶'}
                            </button>
                        )}
                    </div>
                )}

                {pipVisible && logoContent && !isRightCollapsed && (
                    <div
                        className="right-div"
                        style={{
                            width: isLeftCollapsed ? '100%' : '50%',
                            display: 'flex', // Use flexbox to control layout
                            flexDirection: isLeftCollapsed ? 'row' : 'column', // Side by side if left is collapsed
                        }}
                    >
                        {isLeftCollapsed ? (
                            <div className="logodiv2" style={{ width: '50%' }}>
                                <LogoStack
                                    data={logoContent}
                                    onColumnClick={handleColumnClick}
                                    onColumnHover={handleColumnHover}
                                    importantResiduesList={nodeData}
                                    removeNodeHandle={handleNodeRemove}
                                />
                            </div>
                        ) : (
                            <div className="expandedRight">
                                <div className="logodiv" ref={(el) => {(setLogoCallback(el)); logoStackRef.current = el}} style={{ width: isLeftCollapsed ? '50%' : '100%', height: isLeftCollapsed ? '100%' : '250px' }}>
                                    <button
                                        className="logo-close-btn"
                                        onClick={() => {
                                            clearRightPanel();
                                        }}
                                    >
                                        X
                                    </button>
                                    <LogoStack
                                        data={logoContent}
                                        onColumnClick={handleColumnClick}
                                        onColumnHover={handleColumnHover}
                                        importantResiduesList={nodeData}
                                        removeNodeHandle={handleNodeRemove}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pvdiv" ref={(el) => {setPvdivCallback(el); pvdiv.current = el}} style={{ width: isLeftCollapsed ? '50%' : '100%' }}>
                            <MolstarViewer
                                selectedResidue={selectedResidue}
                                colorFile={colorFile}
                                hoveredResidue={hoveredResidue}
                            />
                        </div>
                    </div>
                )}



            </div>

        </div>
    );
};

export default Tol;
