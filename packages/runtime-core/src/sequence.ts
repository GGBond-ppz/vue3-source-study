// 最长递增子序列

// 贪心算法 + 二分查找

// 3 2 8 9 5 6 7 11 15 4 => 2 5 6 7 11 15
// 求最长递增子序列的个数
// 1. 当前这一项比我们最后一项大则放到末尾
// 2. 如果当前这一项比最后一项小，需要在序列中通过二分查找比当前大的这一项替换掉

// 3. 最优的清空，默认递增
export function getSequence(arr) {
  const len = arr.length;
  const result = [0]; // 默认第0个为基准来做序列
  const p = new Array(len).fill(undefined); // 最后要标记索引，放的东西不用关系，但要和数组一样长
  let start;
  let end;
  let middle;
  let resultLastIndex;
  for (let i = 0; i < len; i++) {
    let arrI = arr[i];
    // vue里序列中0意味着没有，需要创建
    if (arrI !== 0) {
      resultLastIndex = result[result.length - 1];
      // 比较最后一项和当前项，如果比当前大则将索引放到结果集中
      if (arr[resultLastIndex] < arrI) {
        result.push(i);
        p[i] = resultLastIndex;
        continue;
      }

      // 通过二分查找找到比当前值大的，用当前值的索引将其替换
      start = 0;
      end = result.length - 1;

      while (start < end) {
        middle = ((start + end) / 2) | 0;

        if (arr[result[middle]] < arrI) {
          start = middle + 1;
        } else {
          end = middle;
        }
      }

      if (arr[result[end]] > arrI) {
        result[end] = i;
        p[i] = result[end - 1];
      }
    }
  }

  // 通过最后一项进行回溯
  let i = result.length;
  let last = result[i - 1];
  while (i-- > 0) {
    result[i] = last; // 最后一项是确定的
    last = p[last];
  }

  return result;
}

// 我们可以通过标记索引的方式，最终通过最后一项将结果还原
