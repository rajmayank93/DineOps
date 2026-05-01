
import { useState } from 'react';
import logo from './logo.svg';
import './App.css';



/*

0 - 9
operations + - * / =
submit 


5 + 6 - 7 
5 + 10 - 7 
5 * 6 * 3 - 7 [5,]
5 * 6 - 7 * 3 [30,-7, 69] // bodmas= 9 // follow bodmass
5 +6  -7 * 20 - 10 = // bodmas -139 // [5 6 -140 -10]
20 / 5 + 4

[]
val=0

/ for each val = val * 10 + ele
+ operation i will push it 
- operation with negative
* operation with val*element
/ operation with ele/val
[5, 6, -7]



*/

function App() {

  let num= ["1","2","3","4","5","6","7","8","9","0",".","+","-","*","/","="];
  let [value, setValue]= useState("");

function handleClickbtn(item){
   setValue((prev)=> prev + item);
}


  function handleCalculate(){
   
    const res= customeval(value);
    setValue(res);


  }


  return (
    <div className="App">
      <div>{value}</div>
     <div>
      <input
      type='text'
      placeholder='Enter Value'
      onChange={(e)=> setValue(e.target.value)}
      />
      <div>
        {num.map((item)=>{
          return <button key={item} onClick={ () => {
            item === "=" ? handleCalculate(): handleClickbtn(item);
          }}>{item}</button>
        }
        )}

      </div>
     </div>
    </div>
  );
}

export default App;
