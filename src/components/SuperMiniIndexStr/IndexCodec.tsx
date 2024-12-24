import { intDecoder } from 'sub_byte';
   
export const spacer = '\u8000';


class FormsAndFreqs{
    raw_bytes: Uint8Array;
    
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
        // this.raw_bytes = bytes(sub_byte.factories.int_encoder(ords, [15]))
        this.raw_bytes = new Uint8Array(intDecoder(ords, null, [15]))
        // this.total_num_forms = null
        // this.num_forms_in_this_section = null
        // this.num_forms_to_go = null
        // this.past_zero_marker = false
        // print(f"{this.raw_bytes=}")
    }
    // def bit_widths(self):
    //     # Total length
    //     yield 4

    //     while True:
    //         if this.past_zero_marker:
    //             yield 4
    //             yield 12
    //         else:
    //             yield 4

    // def __call__(self) -> Iterator[tuple[Literal[*list(ONE_INDEXED_FORMS)], int]]:
    //     uint_iterator = sub_byte.factories.int_decoder(
    //         iter(this.raw_bytes), None, this.bit_widths()
    //     )
    //     this.total_num_forms = this.num_forms_to_go = next(uint_iterator)
    //     for uint in uint_iterator:
    //         this.num_forms_in_this_section = next(uint_iterator)
    //         if uint == 0b000:
    //             assert this.num_forms_in_this_section == this.num_forms_to_go
    //             this.past_zero_marker = True
    //             break

    //         shortcut_freq = uint

    //         for i in range(this.num_forms_in_this_section):
    //             zero_index = next(uint_iterator) - 1
    //             # print(
    //             #     f"{FORMS[zero_index]=}, {shortcut_freq=}, {this.num_forms_in_this_section=}"
    //             # )
    //             yield FORMS[zero_index], shortcut_freq
    //             this.num_forms_to_go -= 1

    //     if this.num_forms_to_go == 0:
    //         return

    //     for uint in uint_iterator:
    //         zero_index = uint - 1
    //         # print(f"{uint=}, {zero_index=}, {FORMS[zero_index]=}")
    //         yield FORMS[zero_index], next(uint_iterator)
    //         this.num_forms_to_go -= 1
    //         if this.num_forms_to_go == 0:
    //             break
}