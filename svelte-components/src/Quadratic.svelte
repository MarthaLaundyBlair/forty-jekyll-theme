<script>
    // Utility Functions
    var isSquare = function (n) {
        return Math.sqrt(n) === Math.round(Math.sqrt(n));
    };

  var simpleFraction = function (numOne, numTwo) {
        let sign =
            (numOne < 0 && numTwo > 0) || (numOne >= 0 && numTwo < 0)
                ? "-"
                : "";
        var num1 = Math.abs(numOne),
            num2 = Math.abs(numTwo);

        for (var i = Math.max(numOne, numTwo); i > 1; i--) {
            if (num1 % i == 0 && num2 % i == 0) {
                num1 = num1 / i;
                num2 = num2 / i;
                if (num2 == 1) {
                    return {
                           fraction: `${sign}${num1}`,
                           num1: `${num1}`,
													 num2: ``,
                        	 sign: `${sign}`,
													 num2Stripped: `${num2}`,
													 num1Sign: `${sign}${num1}`,
											};
                }else {
                    return {
                     				fraction: `${sign}${num1}/${num2}`,
                            num1: `${num1}`,
														num2: `/${num2}`,
                            sign: `${sign}`,
														num2Stripped: `${num2}`,
														num1Sign: `${sign}${num1}`,
										};
                }
            }
        }
        if (num1 == Math.abs(numOne) && num2 == Math.abs(numTwo)) {
            return {
								fraction: `${sign}${num1}/${num2}`,
                num1: `${num1}`,
                num2: `/${num2}`,
                sign: `${sign}`,
								num2Stripped: `${num2}`,
								num1Sign: `${sign}${num1}`,
                };
        }
    };

    var simpleSurd = function (num) {
        let complex = num < 0 ? "i" : "";
        var surd = Math.abs(num),
            factor = 1;

        for (var i = Math.floor(Math.sqrt(surd)); i > 1; i--) {
            if (surd % (i * i) == 0) {
                surd = surd / (i * i);
                factor = factor * i;
            }
        }
        if (factor == 1) {
            return {
                    fullSurd: `${complex}√${surd}`,
                    factor: `${factor}`,
              			complex: `${complex}`,
                		surd: `√${surd}`,
						};
        } else {
            return {
                    fullSurd: `${factor}${complex}√${surd}`,
                		factor: `${factor}`,
                		complex: `${complex}`,
										surd: `√${surd}`
                };
        }
    };

    var squareRoot = function (num) {
        var ans = 0;
        var modulus = Math.abs(num);
        if (isSquare(modulus) && modulus === num) {
            ans = Math.sqrt(num);
            return ans;
        } else if (isSquare(modulus) && modulus !== num) {
            ans = Math.sqrt(Math.abs(num));
            return `${ans}i`;
        } else {
            ans = simpleSurd(num).fullSurd;
            return ans;
        }
    };

    // Quadratic Calc functions
    var calculationParts = function (a, b, c) {
        let A = parseFloat(a);
        let B = parseFloat(b);
        let C = parseFloat(c);
        let D = B * B - 4 * A * C;
        let isComplex = D < 0;
        let modD = Math.abs(D);
        let minusB = -1 * B;
        let twoA = 2 * A;
        let sqrtD = squareRoot(D);
        let sqrtModD = squareRoot(modD);
        let SObject = simpleSurd(D);

        return {
            a,
            b,
            c,
            A,
            B,
            C,
            D,
            isComplex,
            modD,
            minusB,
            twoA,
            sqrtD,
            sqrtModD,
            SObject,
            isSqr: function() { 
                return isSquare(this.D) 
            },
            isComplexSqr: function(){ 
                return this.isComplex && isSquare(this.modD);
            }
        };
    };

    var initialSteps = function (calcParts) {
        // extract the calculation parts we need
        let { A, B, C, D, minusB, twoA } = calcParts;

        return [
            {
                comment: `We start off by noting the quadratic formula`,
                formula: `(-b\xB1√(b\u00B2-4ac))/2a`,
            },
            {
                comment: `In this case we note that a=${A}, b=${B} and c=${C} which we can simply substitute in giving`,
                formula: `(${minusB}\xB1√(${B}\u00B2-4\u00D7${A}\u00D7${C}))/(2√${A})`,
            },
            {
                comment: `Simplifying the denominator and discriminant gives`,
                formula: `(${minusB}\xB1√${D})/${twoA}`,
            },
        ];
    };

    var squareSteps = function (calcData) {
        let { minusB, twoA, D, sqrtD } = calcData;
        let numeratorA = minusB + sqrtD;
        let numeratorB = minusB - sqrtD;
        return [
            {
                comment: `${D} is a perfect square which we can square root to give ${calcData.sqrtD}`,
                formula: `(${minusB}\xB1${sqrtD})/${twoA}`,
            },
            {
                comment: `This can be split to give the following two cases`,
                formula: `${numeratorA}/${twoA} and ${numeratorB}/${twoA}`,
            },
            {
                comment: `This simplifies to give a final answer of`,
                formula: `${simpleFraction(numeratorA, twoA).fraction} and ${
                    simpleFraction(numeratorB, twoA).fraction
                }`,
            },
        ];
    };

    var complexSquareSteps = function (calcData) {
        let { minusB, twoA, sqrtModD, D, sqrtD } = calcData;
        let component1 = simpleFraction(minusB, twoA).fraction;
        let component2 = simpleFraction(sqrtModD, twoA).fraction;

        return [
            {
                comment: `because ${D} is negative, its square root must be imaginary and is therefore given by ${sqrtD}`,
                formula: `(${minusB}\xB1${sqrtD})/${twoA}`,
            },
            {
                comment: `This can be split to give the following two cases`,
                formula: `${minusB}/${twoA}+${sqrtD}/${twoA} and ${minusB}/${twoA}-${sqrtD}/${twoA}`,
            },
            {
                comment: `This simplifies to give a final answer of`,
                formula: `${component1}+${component2}i and ${component1}-${component2}i`,
            },
        ];
    };

    var step4NonSquare = function (calcData) {
        let { minusB, twoA, sqrtModD, modD, D, sqrtD, SObject } = calcData;

        var comment;
        if (calcData.isComplex && SObject.factor != "1") {
            comment = `${D} is negative so its square root must be imaginary and is therefore it is given by ${sqrtD} (where √${modD}=${sqrtModD})`;
        }else if (calcData.isComplex && SObject.factor == "1"){
            comment = `${D} is negative so its square root must be imaginary and is therefore it is given by ${sqrtD}`;
        }else if (SObject.factor == "1") {
            comment = `The square root of ${D} can't be simplified any further`;
        } else {
            comment = `The square root of ${D} simplifies to give ${sqrtD}`;
        }

        let formula = `(${minusB}\xB1${sqrtD})/${twoA}`;

        return { formula, comment };
    };

    var step5NonSquare = function (calcData) {
        let { minusB, twoA, sqrtD } = calcData;
        return {
            comment: `This can be split to give the following two cases`,
            formula: `${minusB}/${twoA}+${sqrtD}/${twoA} and ${minusB}/${twoA}-${sqrtD}/${twoA}`,
        };
    };

    var step6NonSquare = function (calcData) {
        let { minusB, twoA, SObject } = calcData;

        var component1 = simpleFraction(minusB, twoA).fraction;
      	
			let result = simpleFraction(SObject.factor, twoA);  
			
			if (result.num1 == 1 && result.num2 == 1){
				var component2 = `${SObject.complex}${SObject.surd}`;
			}else if (result.num1 == 1 && result.num2 != 1){
				var component2 = `${SObject.complex}${SObject.surd}${result.num2}`;
			}else if (result.num1 != 1 && result.num2 == 1) {
				var component2 = `${result.num1}${SObject.complex}${SObject.surd}`;
			}else if (result.num1 != 1 && result.num2 != 1) {
				var component2 = `${result.num1}${SObject.complex}${SObject.surd}${result.num2}`;
			}
			return {
            comment: `This simplifies to give a final answer of`,
            formula: `${component1}+${component2} and ${component1}-${component2}`,
        };
    };
	
    function calculate(useComplexNumbers) {
        var calcData = calculationParts(a, b, c);
            A = calcData.A;
            B = calcData.B;
            C = calcData.C;
				if (isNaN(parseInt(a)) || isNaN(parseInt(b)) || isNaN(parseInt(c)) || Number.isInteger(A) == false || Number.isInteger(B) == false || Number.isInteger(C) == false){
					
					let A = "";
    			    let B = "";
   				    let C = "";
					 showStep1 = false;
					 steps = [
                {
                    comment: "Oops something went wrong!",
                    formula: "Try inputting integer coefficients instead!",
                },
            ];
						showPart1 = false;
						parts = [{
                    comment: "",
                    formula: "",
                },];
					return {};
				}
        
        count += 1;

        // Set the vars for displaying the formula
        A = calcData.A;
        B = calcData.B;
        C = calcData.C;
		showStep1 = true;
		showPart1 = true;

        if (calcData.isComplex && !useComplexNumbers) {
            steps = [
                {
                    comment: "There is no real answer!",
                    formula: "have your tried our complex numbers flavour?",
                },
            ];
						showStep1 = false;
						count -= 1;
        } else if (calcData.isSqr()) {
            steps = [...initialSteps(calcData), ...squareSteps(calcData)];
        } else if (calcData.isComplexSqr()) {
            steps = [
                ...initialSteps(calcData),
                ...complexSquareSteps(calcData),
            ];
        } else {
            steps = [
                ...initialSteps(calcData),
                step4NonSquare(calcData),
                step5NonSquare(calcData),
                step6NonSquare(calcData),
            ];
        }
			if (calcData.isSqr() && calcData.A == 1){
				parts = [...factoriseInitial(calcData), ...factoriseSimple(calcData)];
			} else if (calcData.isSqr() && calcData.A !== 1){
				parts = [...factoriseInitial(calcData), ...factoriseHard(calcData)];
			} else {
				showPart1 = false;
				parts = [
					{
                    comment: "",
                    formula: "",
                },
				];
			}
			approx = approxCalculate(calcData);
		}	
	
	
		//Factorisation Functions
	
		var approxCalculate = function (calcData) {
			 let { minusB, twoA, D, modD } = calcData;
			 
			 if (D < 0){
				 var x1 = `${minusB/twoA} + ${Math.sqrt(modD)/twoA}i`;
				 var x2 = `${minusB/twoA} - ${Math.sqrt(modD)/twoA}i`;
			 }
			 else {
				 var x1 = `${(minusB + Math.sqrt(D))/twoA}`;
				 var x2 = `${(minusB - Math.sqrt(D))/twoA}`;
			 };
			 return{
                Solution1: `Solution 1 = ${x1}` ,
                Solution2: `Solution 2 = ${x2}`,
            };     
    };
	
	var factoriseInitial = function (calcData, factoriseData) {
			 
			 let {A, B, C} = calcData;
			 
		 	 return [
            {
                comment: `This quadratic can be solved by factorisation!`,
                formula: `ax\u00B2 + bx + c = (px + q)(rx + s) = 0`,
            },
				 		{
                comment: `Lets start by comparing the given form to the desired form...`,
                formula: `${A}x\u00B2 + ${B}x + ${C} = (px + q)(rx + s) = prx\u00B2 + (ps + qr)x + qs = 0 `,
            }, 
        ];
       
    };
	
		var factoriseSimple = function (calcData) {
			 
			 let {A, B, C, minusB, twoA, D, sqrtD} = calcData;
			 let x1 = (minusB + sqrtD)/twoA;
			 let x2 = (minusB - sqrtD)/twoA;
			 
		 	 return [
            {
                comment: `However as the coefficent of x\u00B2 (a) = 1, this problem can easily be simplified to`,
                formula: `x\u00B2 + bx + c = (x + q)(x + s) = x\u00B2 + (q + s)x + qs = 0`,
            },
				  	{
				 				comment: `Comparing the coefficients of the powers of x terms tells us`,
            		formula: `${B} = q + s and ${C} = qs`,
            },
				 		{
                comment: `More simply put we need to find two numbers which add to give ${B} and multiply to give ${C}. This may take a bit of trail and error but you should end up with...`,
                formula: `q = ${-x1} and s = ${-x2} (${-x1}\u00D7${-x2}=${C} and ${-x1}+${-x2}=${B})`,
            },
				 		{
                comment: `From this we can easily obtain the desired factorised form which we can then solve`,
                formula: `(x + ${-x1})(x + ${-x2}) = 0`,
            },
				 		{
                comment: `The only way this can equal zero is if one of the bracketed terms is equal to zero because anything multiplied by zero returns zero. This gives us two equations as follows `,
                formula: `x + ${-x1} = 0 and x + ${-x2} = 0`,
            },
				 		{
                comment: `We can solve these two simple equations to give us our two final solutions of`,
                formula: `${x1} and ${x2}`,
            },
        ];
       
    };
	
	var factoriseHard = function (calcData) {
			 
			 let {A, B, C, minusB, sqrtD, twoA} = calcData;
			
			 let numeratorA = minusB + sqrtD;
       let numeratorB = minusB - sqrtD;
			
			
			
			 let p = simpleFraction(numeratorA, twoA).num2Stripped;
			 let r = simpleFraction(numeratorB, twoA).num2Stripped;
			 let q = simpleFraction(numeratorA, twoA).num1Sign;
			 let s = simpleFraction(numeratorB, twoA).num1Sign;
			 
			 
		 	 return [
				 		{
                comment: `Comparing the coefficients of the powers of x terms tells us`,
                formula: `${A} = pr, ${B} = ps + qr and ${C} = qs`,
            },
				 		{
                comment: `This may seem initially tricky to solve by trial and error, but it gets easier with more practice!`,
                formula: `Writing a list of possibe numbers that multiply to give ${A} and ${C} will help. Try thinking about their relationship to ${B}.`,
           },
				   {
                comment: `We can see that ${p} \u00D7 ${r} = ${A} (a) and therefore write`,
                formula: `(${p}x + q)(${r}x + s) = 0 `,
           },
           {
                comment: `We also can see that  ${q} \u00D7 ${s} = ${C} (c) and because ${B} = (${p} \u00D7 ${s}) + (${q} \u00D7 ${r}) = ${B} this allows us to write`,
                formula: `(${p}x + ${q})(${r}x + ${s}) = 0 `,
           },
				   {
				   	   comment: `The only way this can equal zero is if one of the bracketed terms is equal to zero because anything multiplied by zero returns zero. This gives us two equations as follows `,
                formula: `${p}x + ${q} = 0 and ${r}x + ${s} = 0 `,
            },
				 		{
                comment: `We can solve these two simple equations to give us our two final solutions of`,
                formula: `${simpleFraction(numeratorA, twoA).fraction} and ${simpleFraction(numeratorB, twoA).fraction}`,
            },
				 		
        ];  
    };
	

    // Variables
    let compWithComplex = false;

    let A = "";
    let B = "";
    let C = "";

    let a = "";
    let b = "";
    let c = "";
		let showStep1 = "";
		let showPart1 = "";

    let steps = [];
		let parts = [];
		let approx = [];
		

    let count = 0;

</script>

<div class="inner">
    <section>
        <h1>
            <span class="formula">
                {A || "a"}x<sup>2</sup>+{B || "b"}x+{C || "c"}
            </span>=0
        </h1>

        <div class="field">
            <label for="coef-a">Coefficient a</label>
            <input
                name="coef-a"
                type="text"
                bind:value={a}
                placeholder="enter coefficient a"
            />
        </div>
        <div class="field">
            <label for="coef-b">Coefficient b</label>
            <input
                name="coef-b"
                type="text"
                bind:value={b}
                placeholder="enter coefficient b"
            />
        </div>

        <div class="field">
            <label for="coef-c">Coefficient c</label>
            <input
                name="coef-c"
                type="text"
                bind:value={c}
                placeholder="enter coefficient c"
            />
        </div>

        <div class="6u$ 12u$(small)">
			<input 
                type="checkbox" 
                id="comp-complex" 
                name="comp-complex" 
                bind:checked={compWithComplex}
                on:click={() => calculate(!compWithComplex)}
                >
			<label for="comp-complex">include complex solutions</label>
		</div>

        <button on:click={() => calculate(compWithComplex)}>
            Calc.ulate
			</button>

        {#if compWithComplex}
            <p>
                <br>Currently this quadratic calc.ulator is set to solve quadratics with
                both real and complex solutions.
            </p>
        {:else}
            <p>
                <br>Currently this quadratic calc.ulator is only set to solve quadratics
                with real solutions.
            </p>
        {/if}

        <blockquote>
            {#if count > 0} 
              <span class="x1">{approx.Solution1}</span><br />
              <span class="x2">{approx.Solution2}</span><br />
            {/if}
        </blockquote>

       
           
    
    </section>


    <section class="split">

        <h4>
            {count}
            {count === 1 ? "quadratic" : "quadratics"} calc.ulated!
        </h4>
        
    
					{#if showStep1}
						<h4>
									Quadratic Formula Method-
						</h4>
					{/if}

            {#each steps as step, i}
                        <div class="step">
                                {#if showStep1}
                            <h6>Step {i + 1}</h6>
                                {/if}
                        <span class="comment">{step.comment}</span><br />
                        <span class="formula">{step.formula}</span><br />
                        </div>
            {/each}
			
						{#if isSquare}
                            {#if showPart1}    
								<h4>
									Factorisation Method-
								</h4>
                            {/if}
							{#each parts as part, i}
          			<div class="part">
									{#if showPart1}
								<h6>Step {i + 1}</h6>
									{/if}
           			<span class="comment">{part.comment}</span><br />
           			<span class="formula">{part.formula}</span><br />
           			</div>
      				{/each}
			
						{/if}

    </section> 
</div>