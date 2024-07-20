import moment from "moment"

//utility function for calculating age
const calculateAge = (dob) => {
    //received dob and calculate age by substracting current date and birthDate
    const birthDate = new Date(dob)
    const currentDate = new Date()
    let age = currentDate.getFullYear() - birthDate.getFullYear();

    return age
}

//function for parseaDate
const parseDate = (dateString) => {
    const parseDate = moment(dateString, "DD.MM.YYYY").toDate(); //use moment package for create this format
    return parseDate
}

export {
    calculateAge,
    parseDate
}