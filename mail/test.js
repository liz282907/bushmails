$(function(){




	d3.text("data/2006.csv","text/csv",function(d){
		updateYear("data/2006.csv");

	});

	var width = 800,
		height = 600;
	dealWithYearRect(width,height);

});




function getStatics(matrix){

	max = min =0;
	row_max = row_min = 0;
	for (var i in matrix){
		temp_row_max = d3.sum(matrix[i]);
		temp_row_min = d3.sum(matrix[i]);
		temp_max = Math.max.apply(null,matrix[i]);
		temp_min = Math.min.apply(null,matrix[i]);
		if (temp_max>max) max = temp_max;
		if (temp_min<min) min = temp_min;
		if (temp_row_max>row_max) row_max = temp_row_max;
		if (temp_row_min<row_min) row_mix = temp_row_mix;
	}
	var CONST = {
		max:max,
		min:min,
		row_max:row_max,
		row_min:row_min
	};
	return CONST;

}

/**
function:draw a color legend
*chord_color :map value range from [min,max] -> quantize value ->colorbrew[5]
**/
function generateColorLegend(chord_color){
	var chord_lis = d3.select("#chordcolor_legend")
		.selectAll("li")
		.data(chord_color.range())
		.enter()
		.append("li")
		.style("border-top-color",function(d){
			console.log("set_color:"+d);
			return d;})
		.text(function(d,i)
			{	//here d is the color hex value
				//data_range is a array,like [0,236.888]
				data_range = chord_color.invertExtent(d);
				return d3.round(data_range[1]);
			});
}

function generateOuterColorLegend(outer_color,quantile_range){
	var chord_lis = d3.select("#outercolor_legend")
		.selectAll("li")
		.data(outer_color.range())
		.enter()
		.append("li")
		.style("border-top-color",function(d){
			return d;})
		.text(function(d,i)
			{
				// console.log(data_range);//[0.95, 1.9]
				// console.log(data_range[1]);
				// console.log(upper_upper);//[421.805551, 725.0646769]
				data_range = outer_color.invertExtent(d);
				upper = d3.round(data_range[1]);          //1
				upper_upper = quantile_range.invertExtent(upper);

				return d3.round(upper_upper[1]);
			});

}


function updateYear(csv_name)
{

	var matrix,name;
	var width = 800,
		height = 600,
		innerRadius = Math.min(width,height)*.41
		outerRadius = innerRadius*1.1;
	var svg = d3.select("#main_svg").append("svg")
					.attr("width",width)
					.attr("height",height)
					.append("g")
					.attr("transform","translate("+width/2+","+height/2+")");

	var outer_arc_generator = d3.svg.arc()
							.innerRadius(innerRadius)
							.outerRadius(outerRadius);
	var inner_chord_generator = d3.svg.chord()
									.radius(innerRadius);



	//transform .csv ->matrix
	d3.text(csv_name,"text/csv",function(d){
		rows = d3.csv.parseRows(d);
		name = rows.shift();
		matrix = rows.map(function(v){
			new_v = v.map(function(value){
				new_value = parseFloat(value);
				return new_value;
				});
			return new_v;
			});

/******************************************************
**根据matrix得到一些统计值
******************************************************/
		constants = getStatics(matrix);

/******************************************************
*
******************************************************/

		chord_layout = d3.layout.chord()
								.padding(0.01)
								.sortGroups(d3.descending)
								.sortSubgroups(d3.descending)
								.matrix(matrix);
		dots = chord_layout.groups();
		chords = chord_layout.chords();




	/****
	***quantile颜色编码，去掉为0的值，即按row sum排名进行排序
	***/

		values = dots.map(function(d){return d.value}).filter(function(v){return v!=0});
//		console.log(values);

		var quantile_range = d3.scale.quantile()
							.domain(values)
							.range(d3.range(20));


		var color20 = d3.scale.quantile()
								.domain(d3.range(20))
								.range(d3.scale.category20().range().reverse());
	//						.range(d3.scale.category10().range());

		var chord_color = d3.scale.quantize()
							.domain([constants.min,constants.max])
							.range(d3.range(5).map(function(v,i){
									return colorbrewer.YlGnBu[5][i];
							}));




/******************************************************
*	外部一个个圆环
******************************************************/

		var arc_gs = svg.append("g");


		var chord_groups = arc_gs.selectAll("path")
								.data(dots)
								.enter()
								.append("path")
								.style("fill",function(d){return color20(quantile_range(d.value));})
								.style("stroke",function(d){
									return color20(quantile_range(d.value));})
								.attr("d",outer_arc_generator)
								.on("mouseover",function(d,i){

									involved_name = [d.name];
									d3.select(this).attr("title",name[i]);
									chord_paths.classed("hide",function(p){

										if (p.source.index ==i || p.target.index==i)
										{
											if (p.source.index==i)
												involved_name.push(p.target.name);
											else
												involved_name.push(p.source.name);
											return false;
										}
										else return true;
								//		return p.source.index!=i && p.target.index!=i;
									});

									outer_text.text(function(p,index)
									{
										if(involved_name.indexOf(p.name)!=-1)
											return p.name;
									});
								})
								.on("mouseout",function(d,i){
									chord_paths.classed("hide",false);
									outer_text.text(function(d){if(d.value>50) return d.name;});
								});


/******************************************************
*	外部的text
******************************************************/
		var outer_text = arc_gs.selectAll("text")
								.data(dots)
								.enter()
								.append("text")
								.each(function(d,i){
									d.angle = (d.startAngle+d.endAngle)/2;
									d.name = name[i];
								})
								.attr("dy",".35em")
								.attr("transform", function(d){

										return "rotate(" + (d.angle/Math.PI*180-90) + ")" +
											   "translate("+(outerRadius+10)+",0)" +
											    ( ( d.angle > Math.PI && d.angle < Math.PI*2 ) ? "rotate(180) translate(-70,0)" : "");
									})
								.attr("class","chord_text")
								.text(function(d){
									if (d.value>50)
										return d.name;
								});


/******************************************************
*      内部的chords
******************************************************/


		var chord_paths = svg.append("g")
						.selectAll("path.chord")
						.data(chords)
						.enter()
						.append("path")
						.attr("class","chords")
						.attr("d",inner_chord_generator)
						.style("fill",function(d){

							return chord_color(d.source.value);})
						.style("opacity",1)
						.each(function(d,i){
							d.source.name = name[d.source.index];
							d.target.name = name[d.target.index];

						})
						.attr("title",function(d,i){
							return d.source.name+" send "+d.source.value+" emails to "+d.target.name;
						})
						.on("mouseover",function(d,i)
						{
							// d3.select(this)
							// 	.attr("class","show");
							// d3.selectAll(".chord path")
							// 	.not(".show").addclass("hide");

						})
						.on("mouseout",function(d,i)
						{
							d3.select(this)
								.transition()
								.duration(1000)
								.style("fill",chord_color(d.source.value));
						})
						.on("click",function(d,i){
							console.log(d.source.name);
							console.log(d.target.name);
						});


/********************************************************
****
********************************************************/
			generateColorLegend(chord_color);
			generateOuterColorLegend(color20,quantile_range);





	});



}


function dealWithYearRect(last_svg_width,last_svg_height)
{
	var svg2 = d3.select("#year_label").append("svg")
							.attr("width","100%")
							.attr("height","100%")
							.attr("text-anchor","end");
	var year_text = svg2.append("text")
					.attr("x",last_svg_width*0.4)
					.attr("y",last_svg_height*0.5)
					.attr("class","yeartext")
					.attr("text-anchor","end")
					.text(2006);
	var year_box = year_text.node().getBBox();
	//console.log(year_box);
	var year_overlay = svg2.append("rect")
							.attr("x",year_box.x)
							.attr("y",year_box.y)
							.attr("width",year_box.width)
							.attr("height",year_box.height)
							.attr("class","yearoverlay");
	var yearScale = d3.scale.linear()
						.domain([1999,2006])
						.range([year_box.x,year_box.x+year_box.width])
						.clamp(true);



	year_overlay.on("mouseover",changeBetweenYear);

		function changeBetweenYear()
		{
			year_overlay.on("mouseover",mouseover);
			year_overlay.on("mouseout",mouseout);
			year_overlay.on("mousemove",mousemove);

			function mouseover(){
				year_text.classed("hover",true);
			}
			function mouseout(){
				year_text.classed("hover",false);
			}
			function mousemove(){
				year = d3.round(yearScale.invert(d3.mouse(this)[0]));
				updateYearAndData(year);
			}
		}

		function updateYearAndData(year)
		{
			year_text.text(year);
			csv_name = "data/"+year+".csv";
			updateYear(csv_name);

		}


}