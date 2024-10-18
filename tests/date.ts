import { formatISO } from "date-fns";
import { getTime } from "date-fns";
import { TZDate } from "@date-fns/tz";

const date = new Date()
console.log(date.toISOString())
console.log(formatISO(date)) // 2024-10-16T23:42:06+08:00
console.log(getTime(date))  // 1729093326398 in ms

const tzDate = new TZDate(date, "Asia/Shanghai");
const tzDate2 = new TZDate(date, "America/Los_Angeles");
console.log(formatISO(tzDate))
console.log(formatISO(tzDate2))
