import { expect, test } from "bun:test";
import { base_unit, and_unit, or_unit, parseCondition, in_array_unit, array } from "../parse-condition";

test(`label1=1`, () => {
  expect(base_unit(`label1=1`, 0)).toEqual({
    ok: true,
    pos: 8,
    value: {
      eq: {
        label: 'label1',
        value: '1'
      }
    }
  });
})

test(`label1="1 1"`, () => {
  expect(base_unit(`label1="1 1"`, 0)).toEqual({
    ok: true,
    pos: 12,
    value: {
      eq: {
        label: 'label1',
        value: '1 1'
      }
    }
  });
});

test(`"label  1"="1 1"`, () => {
  expect(base_unit(`"label  1"="1 1"`, 0)).toEqual({
    ok: true,
    pos: 16,
    value: {
      eq: {
        label: 'label  1',
        value: '1 1'
      }
    }
  });
});

test(`label1<>1`, () => {
  expect(base_unit(`label1<>1`, 0)).toEqual({
    ok: true,
    pos: 9,
    value: {
      neq: {
        label: 'label1',
        value: '1'
      }
    }
  });
});

test(`label1<>"1 1" and label2=3`, () => {
  expect(and_unit(`label1<>"1 1" and label2=3`, 0)).toEqual({
    ok: true,
    pos: 26,
    value: {
      and: [
        {
          neq: {
            label: 'label1',
            value: '1 1'
          }
        },
        {
          eq: {
            label: 'label2',
            value: '3'
          }
        }
      ]
    }
  });
});

test(`label1<>"1 1" and (label2=3 or label3="3 3")`, () => {
  expect(and_unit(`label1<>"1 1" and (label2=3 or label3="3 3")`, 0)).toEqual({
    ok: true,
    pos: 44,
    value: {
      and: [
        {
          neq: {
            label: 'label1',
            value: '1 1'
          }
        },
        {
          or: [
            {
              eq: {
                label: 'label2',
                value: '3'
              }
            },
            {
              eq: {
                label: 'label3',
                value: '3 3'
              }
            }
          ]
        }
      ]
    }
  });
});

test(`label1<>"1 1" or (label2=3 and label3="3 3") or label4=4`, () => {
  expect(or_unit(`label1<>"1 1" or (label2=3 and label3="3 3") or label4=4`, 0)).toEqual({
    ok: true,
    pos: 56,
    value: {
      or: [
        {
          neq: {
            label: 'label1',
            value: '1 1'
          }
        },
        {
          and: [
            {
              eq: {
                label: 'label2',
                value: '3'
              }
            },
            {
              eq: {
                label: 'label3',
                value: '3 3'
              }
            }
          ]
        },
        {
          eq: {
            label: 'label4',
            value: '4'
          }
        }
      ]
    }
  });
});

test(`label1<>"1 1" or (label2=3 and label3="3 3") and label4=4`, () => {
  expect(parseCondition(`label1<>"1 1" or (label2=3 and label3="3 3") and label4=4`)).toEqual({
    ok: true,
    pos: 57,
    value: {
      or: [
        {
          neq: {
            label: 'label1',
            value: '1 1'
          }
        },
        {
          and: [
            {
              and: [
                {
                  eq: {
                    label: 'label2',
                    value: '3'
                  }
                },
                {
                  eq: {
                    label: 'label3',
                    value: '3 3'
                  }
                }
              ]
            },
            {
              eq: {
                label: 'label4',
                value: '4'
              }
            }
          ],
        },
      ]
    }
  })
});

test(`label1<>"1 1" or (label2=3 and label3="3 3") and label4 in [1,3,"none of them"]`, () => {
  expect(parseCondition(`label1<>"1 1" or (label2=3 and label3="3 3") and label4 in [1,3,"none of them"]`)).toEqual({
    ok: true,
    pos: 79,
    value: {
      or: [
        {
          neq: {
            label: 'label1',
            value: '1 1'
          }
        },
        {
          and: [
            {
              and: [
                {
                  eq: {
                    label: 'label2',
                    value: '3'
                  }
                },
                {
                  eq: {
                    label: 'label3',
                    value: '3 3'
                  }
                }
              ]
            },
            {
              in: {
                label: 'label4',
                value: ['1', '3', 'none of them']
              }
            }
          ],
        },
      ]
    }
  })
});