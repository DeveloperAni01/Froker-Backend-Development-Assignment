import moment from "moment"

const calculateAge = (dob) => {
    const birthDate = new Date(dob)
    const currentDate = new Date()
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const month_diff = currentDate.getMonth() - birthDate.getMonth();

    return age
}

const parseDate = (dateString) => {
    const parseDate = moment(dateString, "DD.MM.YYYY").toDate();
    return parseDate
}

export {
    calculateAge,
    parseDate
}