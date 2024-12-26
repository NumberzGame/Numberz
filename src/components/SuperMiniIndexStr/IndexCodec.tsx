import {FORMS} from '../NumbersGame/Core';
import { intEncoder, intDecoder } from 'sub_byte';
   
export const spacer = '\u8000';


function next<T>(iterator: IterableIterator<T>): T {
    const result = iterator.next();
    if (result.done) {
        throw new Error(`Decoding error. Ran out of code-units in string.`);
    }
    return result.value;
}


export class FormsAndFreqs{
    rawBytes: Uint8Array;
    totalNumForms: number | null;
    numFormsInThisSection: number | null;
    numFormsToGo: number | null;
    pastZeroMarker: boolean;

    constructor(str: string) {
        // const ords = [ord(c) for c in str]
        // It makes no difference as we're only encoding using the first 
        // 15 bits up to 0x7fff (way below the utf-16 surrogate range 
        // from 0xd800) but iterating the code-units expresses our intent,
        // So it doesn't apply to us, but in general for string work, do 
        // heed the warning regarding String.split(""):
        //
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split#description
        // "Warning: When the empty string ("") is used as a separator, 
        // the string is not split by user-perceived characters..."
        const ords = str.split("").map((c) => c.charCodeAt(0));
        // this.rawBytes = bytes(sub_byte.factories.int_encoder(ords, [15]))
        this.rawBytes = new Uint8Array(intEncoder(ords, [15]));
        this.totalNumForms = null
        this.numFormsInThisSection = null
        this.numFormsToGo = null
        this.pastZeroMarker = false;
        // print(f"{this.rawBytes=}")
    }


    *bitWidths(): IterableIterator<4 | 12>{
        // Total length
        yield 4;

        while (true) {
            if (this.pastZeroMarker) {
                yield 4;
                yield 12;
            } else {
                yield 4;
            }
        }
    }


    *formsAndFreqs(): IterableIterator<[string, number]> {
        this.pastZeroMarker = false;
        const uintIterator: IterableIterator<number> = intDecoder(this.rawBytes, null, this.bitWidths());

        this.totalNumForms = this.numFormsToGo = next(uintIterator);
        // This while loop is needed instead of a for/of, as we wish to resume
        // iteration of uintIterator in a later loop.
        // Breaking out of a for/of loop, over a Generator, calls the 
        // Generator's return method, closing it.   
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of#description
        while (true) {
            let result = uintIterator.next(); 
            if (result.done) {
                break;
            }
            const uint = result.value;
            this.numFormsInThisSection = next(uintIterator);

            if (uint === 0b000) {
           
                if (this.numFormsInThisSection !== this.numFormsToGo) {
                    throw new Error(
                        `Num forms in non-shortcutted section ${this.numFormsInThisSection}, `
                        +`the last section, should equal the remaining number of forms to go ${this.numFormsToGo}`
                        +'(after the number of forms in each previous sections has been subtracted off).'
                    );
                }
                this.pastZeroMarker = true;
                break;
            }
            const shortcut_freq = uint;

            for (let i = 0; i < this.numFormsInThisSection; i++) {
                
                const zeroIndex = next(uintIterator) - 1;
                yield [FORMS[zeroIndex], shortcut_freq];
                this.numFormsToGo -= 1
            }
        }

        if (this.numFormsToGo === 0) {
            return;
        }

        for (const uint of uintIterator) {
            const zeroIndex = uint - 1;
            yield [FORMS[zeroIndex], next(uintIterator)];
            this.numFormsToGo -= 1;
            if (this.numFormsToGo === 0) {
                break;
            }
        }


    }
}

let faf = new FormsAndFreqs("\u5089\u605a\u42e0\u7d02\u1d80\u5b00\u3541\u2090\u6428\u0fe0\u2300");
console.log(Array.from(faf.formsAndFreqs()));