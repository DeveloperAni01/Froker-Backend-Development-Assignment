//define promise handler for handle async functions more precising way
const AsyncHandler = (RequestHandler) => {
    return (req, res, next) => {
        Promise.resolve(RequestHandler(req, res, next))
            .catch((err) => next(err))
    }
}

export {AsyncHandler}