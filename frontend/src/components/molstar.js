import React, { useEffect, useState, createRef } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginCommands } from "molstar/lib/mol-plugin/commands";
import { StructureSelection, Structure, StructureProperties } from 'molstar/lib/mol-model/structure';
import { ColorNames } from "molstar/lib/mol-util/color/names";
import { Script } from 'molstar/lib/mol-script/script';
import { setStructureOverpaint } from 'molstar/lib/mol-plugin-state/helpers/structure-overpaint';
import { Color } from 'molstar/lib/mol-util/color';
import { CartoonRepresentationProvider } from 'molstar/lib/mol-repr/structure/representation/cartoon' 
import { ViewportControls } from 'molstar/lib/mol-plugin-ui/viewport';
import "./molstar/skin/light.scss";

export function MolStarWrapper({ structData, selectedResidue, hoveredResidue, colorFile, scrollLogosTo }) {
  const parent = createRef();
  const [isStructureLoaded, setIsStructureLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      // Initialize the Mol* plugin
      window.molstar = await createPluginUI({
        target: parent.current,
        render: renderReact18,
        spec: {
          ...DefaultPluginUISpec(),
          layout: {
            initial: {
              isExpanded: false,
              showControls: true,
            }
          },
        },
      });

      // Set the background color of the viewer to gray
      const renderer = window.molstar.canvas3d.props.renderer;
      if (renderer) {
        PluginCommands.Canvas3D.SetSettings(window.molstar, {
          settings: {
            renderer: {
              ...renderer,
              backgroundColor: ColorNames.white,
            },
          },
        });
      }

      // Set default spin
      // window.molstar.canvas3d.setProps({
      //   trackball: { animate: { name: 'spin', params: { speed: .5 } } } // or { name: 'off', params: { }}
      // });

      // Loading the default pdb file

      if (structData == null) {
        await fetch(`${process.env.PUBLIC_URL}/example/seq.pdb`)
          .then((response) => response.text())
          .then((text) => {
            structData = text;
          })
          .catch((error) => console.error("Error fetching struct data:", error));
      }

      const myData = await window.molstar.builders.data.rawData({
        data: structData, /* string or number[] */
        label: void 0 /* optional label */
      });

      const trajectory = await window.molstar.builders.structure.parseTrajectory(myData, "pdb");
      const structure = await window.molstar.builders.structure.hierarchy.applyPreset(
        trajectory,
        "default"
      );

      const cartoon = structure.representation.representations.polymer.data.repr;
      const reprCtx = window.molstar.representation.structure;
      // console.log(reprCtx)

      // console.log(cartoon)

      cartoon.setTheme({
        "color": {
          "granularity": "uniform",
          "props": {
            "value": 13421772,
            "saturation": 0,
            "lightness": 0
          },
          "description": "Gives everything the same, uniform color.",
          "legend": {
            "kind": "table-legend",
            "table": [
              [
                "uniform",
                13421772
              ]
            ]
          }
        },
        "size": {
          "granularity": "uniform",
          "props": {
            "value": 1
          },
          "description": "Gives everything the same, uniform size."
        }
      });
      // await cartoon.createOrUpdate({ ...CartoonRepresentationProvider.defaultValues, quality: 'auto' }, structure).run();
      // this.canvas3d.add(cartoonRepresentation);



      // Scrolls seqlogos to selection position
      window.molstar.behaviors.interaction.click.subscribe(
        (event) => {
          const selections = Array.from(
            window.molstar.managers.structure.selection.entries.values()
          );
          // selections is auto-sorted, lowest residue id first. Therefore, when multiple residues are selected, 
          // the logo will only scroll to the residue with the lowest id.
          const localSelected = [];
          for (const { structure } of selections) {
            if (!structure) continue;
            Structure.eachAtomicHierarchyElement(structure, {
              residue: (loc) => {
                const position = StructureProperties.residue.label_seq_id(loc);
                localSelected.push({ position });
              },
            });
          }
          if (localSelected[0]) {
            scrollLogosTo(localSelected[0].position);
          }
        });

      // Set the structure as loaded
      setIsStructureLoaded(true);
    }

    init();

    return () => {
      // Clean up on unmount
      window.molstar?.dispose();
      window.molstar = undefined;
    };
  }, []);

  useEffect(() => {
    if (isStructureLoaded) {
      applyColorFile(colorFile);
    }
  }, [isStructureLoaded, colorFile]);

  useEffect(() => {
    if (isStructureLoaded) {
      selectResidue(selectedResidue);
    }
  }, [isStructureLoaded, selectedResidue]);

  useEffect(() => {
    if (isStructureLoaded) {
      selectResidue(hoveredResidue, true);
    }
  }, [isStructureLoaded, hoveredResidue]);

  async function selectResidue(residueNumber, hovered = false) {
    if (residueNumber == null) return;
    const seq_id = residueNumber;

    console.log("selecting residue", seq_id);

    if (!window.molstar || !window.molstar.managers.structure.hierarchy.current.structures.length) {
      console.error("Mol* plugin or structure data is not initialized.");
      return;
    }

    const structure = window.molstar.managers.structure.hierarchy.current.structures[0]?.cell?.obj?.data;
    if (!structure) {
      console.error("Structure data is not available.");
      return;
    }

    const sel = Script.getStructureSelection(Q => Q.struct.generator.atomGroups({ // Call to query the structure using residue number to get a Loci
      'residue-test': Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_seq_id(), seq_id]),
      'group-by': Q.struct.atomProperty.macromolecular.residueKey()
    }), structure);
    const loci = StructureSelection.toLociWithSourceUnits(sel);

    if (hovered) {
      window.molstar.managers.interactivity.lociHighlights.highlightOnly({ loci }); // Highlight the residue
      return;
    }
    // Clear previous selections
    window.molstar.managers.interactivity.lociSelects.deselectAll();
    window.molstar.managers.interactivity.lociSelects.select({ loci }); // Select the residue
  }

  async function applyColorFile(colorFile) {
    if (!colorFile) return;

    if (!window.molstar || !window.molstar.managers.structure.hierarchy.current.structures.length) {
      console.error("Mol* plugin or structure data is not initialized.");
      return;
    }

    for (let i = 0; i < colorFile.length; i++) { // Default for loop, because forEach is async and setStructureOverpaint doesn't like that
      const color = colorFile[i];

      await setStructureOverpaint(
        window.molstar,
        window.molstar.managers.structure.hierarchy.current.structures[0].components,
        Color(color),
        (s) => {
          const sel = Script.getStructureSelection(Q =>
            Q.struct.generator.atomGroups({
              'residue-test': Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_seq_id(), i + 1]), // Adjusted to match sequence number
              'group-by': Q.struct.atomProperty.macromolecular.residueKey(),
            }), s
          );
          return StructureSelection.toLociWithSourceUnits(sel);
        }
      );
    }

  }

  return (
    <div
      ref={parent}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 1, // Matches z value of navbar
      }}
    />
  );
}

export default MolStarWrapper;
