module powerbi.extensibility.visual {
    /**
     * Interface for BarCharts viewmodel.
     *
     * @interface
     * @property {TestItem[]} dataPoints - Set of data points the visual will render.
     * @property {number} dataMax                 - Maximum data value in the set of data points.
     */
    interface BarChartViewModel {
        dataPoints: TestItem[];
        dataMax: number;
        settings: BarChartSettings;
    };
    
    /**
     * Interface for BarCharts viewmodel.
     *
     * @interface
     * @property {string} category 
     * @property {number} Cost 
       @property {string} color
       @property {ISelectionId} selectionId
     */

    export interface TestItem {
      category: string;
      Cost: number;
      color: string;
      selectionId: powerbi.visuals.ISelectionId;
    }

    /**
     * Interface for BarChart settings.
     *
     * @interface
     * @property {{show:boolean}} enableAxis - Object property that allows axis to be enabled.
     * @property {{generalView.opacity:number}} Bars Opacity - Controls opacity of plotted bars, values range between 10 (almost transparent) to 100 (fully opaque, default)
     * @property {{generalView.showHelpLink:boolean}} Show Help Button - When TRUE, the plot displays a button which launch a link to documentation.
     */
    interface BarChartSettings {
        enableAxis: {
            show: boolean;
        };

        generalView: {
            opacity: number;
            showHelpLink: boolean;
        };
    }


    export class Visual implements IVisual {
        private target: HTMLElement;
        private settings: VisualSettings;
        private svg: d3.Selection<SVGElement>;
        private g: d3.Selection<SVGElement>;
        private host: IVisualHost;
        private selectionManager: ISelectionManager;
        private barChartContainer: d3.Selection<SVGElement>;
        private margin = { top: 20, right: 20, bottom: 200, left: 70 };
        private barDataPoints: TestItem[];
        private barChartSettings: BarChartSettings;
      //  private tooltipServiceWrapper: ITooltipServiceWrapper;
        private locale: string;
        private helpLinkElement: Element;


        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
            let svg = this.svg = d3.select(options.element)
                .append('svg').classed('liquidFillGauge', true);
            this.g = this.svg.append('g');
            this.locale = options.host.locale;
            // this.g.append("circle")
            //     .attr("cx", 50)
            //     .attr("cy", 50)
            //     .attr("r", 50)
            //     .style("fill", 'green');
        }

        public update(options: VisualUpdateOptions) {
            let viewModel: BarChartViewModel = Visual.converter(options, options.dataViews[0].table.rows, this.host)
            var _this = this;
            this.barDataPoints = viewModel.dataPoints;
           var newArray = []
          newArray.push(viewModel.dataPoints[0], viewModel.dataPoints[2], viewModel.dataPoints[1])
           viewModel.dataPoints = newArray;

            // get height and width from viewport
            _this.svg.attr({
              height: options.viewport.height,
              width: options.viewport.width
            });
            var gHeight = options.viewport.height
              - _this.margin.top
              - _this.margin.bottom;
            var gWidth = options.viewport.width
              - _this.margin.right
              - _this.margin.left;
            _this.g.attr({
              height: gHeight,
              width: gWidth
            });
            _this.g.attr('transform',
              'translate(' + _this.margin.left + ',' + _this.margin.top + ')');
             var dat =
              Visual.converter(options, options.dataViews[0].table.rows, this.host);
         // setup d3 scale
            var xScale = d3.scale.ordinal()
              .domain((viewModel.dataPoints).map(function (d) { return d.category; }))
              .rangeRoundBands([0, gWidth], 0.1);
            var yMax =
              d3.max(viewModel.dataPoints, function (d) { return d.Cost + 10 });
            var yScale = d3.scale.linear()
              .domain([0, yMax])
              .range([gHeight, 0]);

            // remove exsisting axis and bar
            _this.svg.selectAll('.axis').remove();
            _this.svg.selectAll('.bar').remove();
           // draw x axis
            var xAxis = d3.svg.axis()
              .scale(xScale)
              .orient('bottom');
            _this.g
              .append('g')
              .attr('class', 'x axis')
              .style('fill', 'black') // you can get from metadata
              .attr('transform', 'translate(0,' + (gHeight - 1) + ')')
              .call(xAxis)
              .selectAll('text') // rotate text
              .style('text-anchor', 'middle')
              .attr('dy', '1.1em')
              .attr('transform', 'rotate(0)');
          // draw y axis
            var yAxis = d3.svg.axis()
              .scale(yScale)
              .orient('left');
            _this.g
              .append('g')
              .attr('class', 'y axis')
              .style('fill', 'black') // you can get from metadata
              .call(yAxis);

            // draw bar
            var shapes = _this.g
              .append('g')
              .selectAll('.bar')
              .data(viewModel.dataPoints);
            shapes.enter()
              .append('rect')
              .attr('class', function(d,i) {
                return 'bar bar-' + i
              })
              .attr('fill', function (d) {
                return d.color
              })
              .attr('stroke', 'black')
              .attr('x', function (d) {
                return xScale(d.category);
              })
              .attr('width', xScale.rangeBand())
              .attr('y', function (d,i) {
                return (i==1) ? yScale(viewModel.dataPoints[0]["Cost"]) : yScale(d.Cost);
              })
              .attr('height', function (d) {
                return gHeight - yScale(d.Cost);
              });

            let selectionManager = this.selectionManager;
            let allowInteractions = this.host.allowInteractions;

            shapes.on('click', function(d) {
              console.log(d.selectionId);
                if (allowInteractions) {
                    selectionManager.select(d.selectionId).then((ids: ISelectionId[]) => {
                        shapes.attr({
                            'fill-opacity': ids.length > 0 ? .3 : 1
                        });

                        d3.select(this).attr({
                            'fill-opacity': 1
                        });
                    });
                    (<Event>d3.event).stopPropagation();
                }

            })
            shapes
              .exit()
              .remove();
           //draw lines
            var lines = _this.g
              .append('g')
              .selectAll('.line')
              .data(viewModel.dataPoints);
            lines
              .enter()
              .append("line")
              .style("stroke", "black")
              .style("stroke-width", "1px")
              .attr("x1", function(d,i) {
                return (i==1) ? (+xScale(viewModel.dataPoints[1]["category"]) - +xScale(viewModel.dataPoints[0]["category"])) : 0;
              })
              .attr("x2", function(d,i) {
               return (i==1) ? xScale(d.category) : 0
              })                  
              .attr("y1", function(d,i) {
               return yScale(viewModel.dataPoints[0]["Cost"])
              })
              .attr("y2", function(d,i) {
               return yScale(viewModel.dataPoints[0]["Cost"])
              })
            lines
              .enter()
              .append("line")
              .style("stroke", "black")
              .style("stroke-width", "1px")
              .attr("x1", function(d,i) {
                return (i==1) ? xScale(d.category) : 0;
              })
              .attr("x2", function(d,i) {
               return (i==1) ? xScale(viewModel.dataPoints[2]["category"]) : 0
              })                  
              .attr("y1", function(d,i) {
               return yScale(viewModel.dataPoints[2]["Cost"])
              })
              .attr("y2", function(d,i) {
               return yScale(viewModel.dataPoints[2]["Cost"])
              })

        }

        public destroy(): void {
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         * Below is a code snippet for a case where you want to expose a single property called "lineColor" from the object called "settings"
         * This object and property should be first defined in the capabilities.json file in the objects section.
         */

        /**
         * Enumerates through the objects defined in the capabilities and adds the properties to the format pane
         *
         * @function
         * @param {EnumerateVisualObjectInstancesOptions} options - Map of defined objects
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            let objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];
            switch (objectName) {

                case 'generalView':
                  for (let barDataPoint of this.barDataPoints){
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            opacity: 1,//this.barChartSettings.generalView.opacity,
                            showHelpLink: false//this.barChartSettings.generalView.showHelpLink
                        },
                        validValues: {
                            opacity: {
                                numberRange: {
                                    min: 10,
                                    max: 100
                                }
                            }
                        },
                        selector: null
                    });
                   }
               case 'colorSelector':
                    for (let barDataPoint of this.barDataPoints) {
                        objectEnumeration.push({
                            objectName: objectName,
                            displayName: barDataPoint.category,
                            properties: {
                                fill: {
                                    solid: {
                                        color: barDataPoint.color
                                    }
                                }
                            },
                            selector: barDataPoint.selectionId.getSelector()
                        });
                    }
                    break;
            };
            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }
      /**
       * Function that converts queried data into a view model that will be used by the visual.
       *
       * @function
       * @param {VisualUpdateOptions} options - Contains references to the size of the container
       *                                        and the dataView which contains all the data
       *                                        the visual had queried.
       * @param {IVisualHost} host            - Contains references to the host which contains services
       */
        public static converter(options: VisualUpdateOptions, rows: DataViewTableRow[], host: IVisualHost): BarChartViewModel {
            let dataViews = options.dataViews;

            let defaultSettings: BarChartSettings = {
                enableAxis: {
                    show: false,
                },
                generalView: {
                    opacity: 100,
                    showHelpLink: false
                }
            };
            let viewModel: BarChartViewModel = {
              dataPoints: [],
              dataMax: 0,
              settings: <BarChartSettings>{}
            };
            // if (!dataViews
            //   || !dataViews[0]
            //   || !dataViews[0].categorical
            //   || !dataViews[0].categorical.categories
            //   || !dataViews[0].categorical.categories[0].source
            //   || !dataViews[0].categorical.values)
            //   return viewModel

            let categorical = dataViews[0].categorical;
            console.log(categorical)
            let category = categorical.categories[0];
           // let category = dataViews[0].metadata.columns;
            let dataValue = categorical.values[0];
            let barChartDataPoints: TestItem[] = [];
            let dataMax: number;
            var colors = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854"];
            let colorPalette: IColorPalette = host.colorPalette;
            let objects = dataViews[0].metadata.objects;
            console.log(dataViews[0].metadata)
         //   var resultData: TestItem[] = [];
            let barChartSettings: BarChartSettings = {
                enableAxis: {
                    show: false, //getValue<boolean>(objects, 'enableAxis', 'show', defaultSettings.enableAxis.show),
                },
                generalView: {
                    opacity: 100, //getValue<number>(objects, 'generalView', 'opacity', defaultSettings.generalView.opacity),
                    showHelpLink: false, // getValue<boolean>(objects, 'generalView', 'showHelpLink', defaultSettings.generalView.showHelpLink),
                }
            };
            var totalLength = rows.length + 1
            for (var i = 0; i < totalLength ; i++) {

              var totalCost: number = 0
              var difference: number = 0

              if (i == (totalLength - 1)) {
                for (var i = 0; i < totalLength - 1 ; i++) {
                  var eachAmount: number = (+rows[i][1]);
                  totalCost = totalCost + eachAmount
                  difference = Math.abs((+rows[0][1]) - +rows[1][1])
                }
                var row = rows[i];
                barChartDataPoints.push({
                category: "Total",
                Cost: difference,
                color: colors[i], //getCategoricalObjectValue<Fill>(category, i, 'colorSelector', 'fill', defaultColor).solid.color,
                selectionId: host.createSelectionIdBuilder()
                   .withCategory(category, i)
                  // .withMeasure(dataValue.source.queryName)
                   .createSelectionId()
                });
              }else {                

                var row = rows[i];
                barChartDataPoints.push({
                category: String(category.values[i]),
                Cost: +dataValue.values[i],
                color: colors[i],
                selectionId: host.createSelectionIdBuilder()
                   .withCategory(category, i)
                 //  .withMeasure(dataValue.source.queryName)

                   .createSelectionId()
                });
              }
              dataMax = <number>dataValue.maxLocal;
            }

            // return newArray;
            return {
             dataPoints: barChartDataPoints,
             dataMax: dataMax,
             settings: barChartSettings,
           }
        }
    }
}