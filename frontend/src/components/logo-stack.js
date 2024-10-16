import React, { useState, useRef, useEffect, useImperativeHandle } from "react";
import Logo from './logo/logo.jsx';
import { EasyScroller } from 'easyscroller';
import { ProteinAlphabet } from "./logo/proteinlogo.jsx";
import "./logojs.css";

const LogoStack = React.forwardRef(
    /*
        data: A json object containing entries {nodeName: fasta_data}
        onColumnClick (optional): A function to handle click events on the logo
        onColumnHover (optional): A function to handle hover events on the logo
    */
    ({ data, onColumnClick, onColumnHover, importantResiduesList, removeNodeHandle }, ref) => {
        const [fastaContent, setFastaContent] = useState({});
        const [refsUpdated, setRefsUpdated] = useState(0);
        const logoRefs = useRef([]);
        const backScrollers = useRef([]);
        const frontScrollers = useRef([]);
        const [renderLogos, setRenderLogos] = useState(false);

        const fetchFastaFiles = async (data) => {
            let fastaData = {};

            const fetchPromises = Object.keys(data).map(async (key) => {
                try {
                    const response = await fetch(data[key]);
                    const content = await response.text();
                    fastaData[key] = content;
                } catch (error) {
                    console.error(`Error fetching file for ${key}:`, error);
                }
            });

            await Promise.all(fetchPromises);
            return fastaData;
        };

        // Helper function to add logo refs
        const addLogoRef = (ref) => {
            if (ref && !logoRefs.current.includes(ref)) {
                logoRefs.current.push(ref);
                setRefsUpdated((prev) => prev + 1);
            }
        };

        useEffect(() => { // First call should use this function
            if (!data) {
                console.error('No data provided to render Logo');
                return;
            }

            setFastaContent(data);
        }, [data]);

        useEffect(() => {
            setRenderLogos(true);
        }, [fastaContent]);

        // Handling Sync Scrolling
        useEffect(() => {
            // Destroy existing scrollers - This is done to prevent overlapping scrollers
            backScrollers.current.forEach((scroller) => {
                scroller.destroy();
            });
            frontScrollers.current.forEach((scroller) => {
                scroller.destroy();
            });
            // init two layers of scrollers for each logo
            logoRefs.current.forEach((ref, index) => {
                const frontScroller = new EasyScroller(ref, {
                    scrollingX: true,
                    scrollingY: false,
                    animating: false,
                    zooming: 0,
                    minZoom: 1,
                    maxZoom: 1,
                    bouncing: false,
                });

                const backScroller = new EasyScroller(ref, {
                    scrollingX: true,
                    scrollingY: false,
                    animating: false,
                    zooming: 0,
                    minZoom: 1,
                    maxZoom: 1,
                    bouncing: false,
                });
                backScrollers.current.push(backScroller);
                frontScrollers.current.push(frontScroller);
            });

            // Connect back and front layer of scrollers
            backScrollers.current.forEach((curr, index) => {
                curr.scroller.__callback = (left, top, zoom) => {
                    backScrollers.current.forEach((otherRef, otherIndex) => { // Set location of back scrollers
                        if (index !== otherIndex) {
                            otherRef.scroller.__scrollLeft = left;
                        }
                    });

                    frontScrollers.current.forEach((frontScroller, frontIndex) => { // Update and render front scrollers
                        if (index !== frontIndex) {
                            frontScroller.scroller.__publish(left, 0, 1, true);
                        }
                    });
                }
            });

        }, [refsUpdated, fastaContent]);

        // Function to download SVG
        const downloadLogoSVG = (logoIndex, fileName) => {
            if (!logoRefs.current[logoIndex]) {
                console.error('Logo not found');
                return;
            }
            const svgElement = logoRefs.current[logoIndex].querySelector('svg');
            const serializer = new XMLSerializer();
            let source = serializer.serializeToString(svgElement);
            const styleString = `
                <style>
                    .glyphrect {
                        fill-opacity: 0.0;
                    }
                </style>`;
            source = source.replace('</svg>', `${styleString}</svg>`);
            const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            const downloadLink = document.createElement('a');
            downloadLink.href = svgUrl;
            downloadLink.download = fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };

        const removeLogo = (logoIndex) => {
            // Remove the logo from the list
            const newFastaContent = { ...fastaContent };
            delete newFastaContent[Object.keys(fastaContent)[logoIndex]];
            // Remove logoRef from list
            logoRefs.current.splice(logoIndex, 1);
            setFastaContent(newFastaContent);
            setRefsUpdated(refsUpdated - 1);

            removeNodeHandle(logoIndex); // Call the parent function to remove the node from list in Results.js
        };

        useImperativeHandle(ref, () => ({
            scrollTo: (index) => {
                backScrollers.current.forEach((scroller) => {
                    scroller.scroller.__publish(index * 28.7, 1, 1, true);
                });
            },
            appendLogo: (key, path) => {
                // Fetch the fasta file and append to the list
                fetchFastaFiles({ [key]: path })
                    .then(fetchedContent => {
                        setFastaContent({ ...fastaContent, ...fetchedContent });
                        setRefsUpdated(refsUpdated + 1);
                    })
                    .catch(error => console.error('Error fetching data:', error));
            }
        }));

        return (
            <div style={{ overflowX: 'hidden' }}>
                {renderLogos ? (
                    Object.keys(fastaContent).map((key, index) => {
                        return (
                            <div className={"logo_" + index} key={key}>
                                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: "40px", marginLeft: "5px", justifyContent: "space-between" }}>
                                    <p style={{paddingLeft: "30px"}}><b>{key}</b></p>
                                    <span style={{paddingRight: "30px"}}>
                                        <button className="logo-download-btn" style={styles.downloadBtn} onClick={() => downloadLogoSVG(index, 'seqlogo_' + key + '.svg')}>Download SVG</button>
                                        <button className="logo-remove-btn" style={styles.removeBtn} onClick={() => removeLogo(index)}>Remove</button>
                                    </span>
                                </div>
                                <div
                                    className="logo_render"
                                    style={{ display: 'flex', height: '200px', width: 'max-content', overflowX: 'hidden' }}
                                    ref={(el) => addLogoRef(el)}
                                >
                                    <Logo
                                        fasta={fastaContent[key]}
                                        alphabet={ProteinAlphabet}
                                        onSymbolClick={onColumnClick}
                                        importantResidues={importantResiduesList[key] || {
                                            differing_residues: [], // If no important residues are provided, default to empty list
                                        }}
                                        mode="FREQUENCY"
                                    //onSymbolMouseOver={onColumnHover} // Disabled due to performance issues: Hovering over column is choppy. Highlighting on structure is ok
                                    />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p>Loading...</p>
                )}
            </div>
        );
    }
);

const styles = {
    downloadBtn: {
        display: "inline-flex",
        flexDirection: "row",
        alignItems: "center",
        border: "none",
        borderRadius: "3px",
        cursor: "pointer",
        fontSize: "14px",
        justifyContent: "center",
        padding: "5px 10px",
        textAlign: "center",
        verticalAlign: "middle",
        height: "30px",
        padding: "5px",
        backgroundColor: "#def2b3",
        alignItems: "center",
    },
    removeBtn: {
        display: "inline-flex",
        flexDirection: "row",
        alignItems: "center",
        border: "none",
        borderRadius: "3px",
        cursor: "pointer",
        fontSize: "14px",
        justifyContent: "center",
        padding: "5px 10px",
        textAlign: "left",
        verticalAlign: "middle",
        height: "30px",
        padding: "5px",
        backgroundColor: "#f2b4b3",
    }
}

export default LogoStack;
