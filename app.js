var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var cybersourceRestApi = require('cybersource-rest-client');

// common parameters
const AuthenticationType = 'http_signature';
const RunEnvironment = 'cybersource.environment.SANDBOX';
const MerchantId = '123456789098';

// http_signature parameters
const MerchantKeyId = '6d1ac1b7-2a55-4b20-b488-965dfaa6e1f9';
const MerchantSecretKey = 'x5QJH8w/dJNddg9ZPhl7Iw1NBN19BcPTHcOkc5ZFx5U=';

// jwt parameters
const KeysDirectory = 'Resource';
const KeyFileName = 'testrest';
const KeyAlias = 'testrest';
const KeyPass = 'testrest';

// logging parameters
const EnableLog = true;
const LogFileName = 'cybs';
const LogDirectory = '../log';
const LogfileMaxSize = '5242880'; //10 MB In Bytes


var configObj = {
        'authenticationType': AuthenticationType,
        'runEnvironment': RunEnvironment,

        'merchantID': MerchantId,
        'merchantKeyId': MerchantKeyId,
        'merchantsecretKey': MerchantSecretKey,

        'keyAlias': KeyAlias,
        'keyPass': KeyPass,
        'keyFileName': KeyFileName,
        'keysDirectory': KeysDirectory,

        'enableLog': EnableLog,
        'logFilename': LogFileName,
        'logDirectory': LogDirectory,
        'logFileMaxSize': LogfileMaxSize
};


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
        extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// route pages
app.get('/checkout', function (req, res) {

        try {
                var instance = new cybersourceRestApi.KeyGenerationApi(configObj);

                var request = new cybersourceRestApi.GeneratePublicKeyRequest();
                request.encryptionType = 'RsaOaep256';
                request.targetOrigin = 'https://flex-mocroform-poc.herokuapp.com/';

                var options = {
                        'generatePublicKeyRequest': request
                };

                console.log('\n*************** Generate Key ********************* ');

                instance.generatePublicKey(options, function (error, data, response) {
                        if (error) {
                                console.log('Error : ' + error);
                                console.log('Error status code : ' + error.statusCode);
                        } else if (data) {
                                console.log('Data : ' + JSON.stringify(data));
                                res.render('index', {
                                        keyInfo: JSON.stringify(data.jwk)
                                });
                        }
                        console.log('Response : ' + JSON.stringify(response));
                        console.log('Response Code Of GenerateKey : ' + response['status']);
                });
        } catch (error) {
                res.send('Error : ' + error + ' Error status code : ' + error.statusCode);
        }


});

// route pages
app.post('/receipt', function (req, res) {
        console.log('GOT HERE');
        try {

                console.log('Response : ' + req.body.flexresponse);
                var tokenResponse = JSON.parse(req.body.flexresponse)

                res.render('receipt', {
                        flexresponse: req.body.flexresponse,
                        flextoken: tokenResponse.token
                });

        } catch (error) {
                res.send('Error : ' + error + ' Error status code : ' + error.statusCode);
        }


});
app.post('/pay', function (req, res) {
        console.log('GOT HEREASD');
        try {

                console.log('Response : ' + req.body.flexresponse);
                var tokenResponse = JSON.parse(req.body.flexresponse)

                res.render('pay', {
                        flexresponse: req.body.flexresponse,
                        tokenizedCard: tokenResponse.token.toLocaleString()
                });

        } catch (error) {
                res.send('Error : ' + error + ' Error status code : ' + error.statusCode);
        }


});
app.post('/confirmOrder', function (req, res) {
        console.log('GOT HEREASD');
        try {
                var instance = new cybersourceRestApi.CaptureApi(configObj);
                console.log('confirm payment and launch confirm order page')

                function callback(error, data) {
                        if (error) {
                                (res.send('Error : ' + error + ' Error status code : ' + error.statusCode))
                        } else {
                                res.render('confirmOrder');
                        }
                };
                processPayment(callback, true, req.body)

        } catch (error) {
                res.send('Error : ' + error + ' Error status code : ' + error.statusCode);
        }


});
// catch 404 and forward to error handler
app.use(function (req, res, next) {
        next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.render('error');
});

function processPayment(callback, enableCapture, data) {
        try {
                console.log('here')
                var instance = new cybersourceRestApi.PaymentsApi(configObj);

                var clientReferenceInformation = new cybersourceRestApi.Ptsv2paymentsClientReferenceInformation();
                clientReferenceInformation.code = 'test_payment';

                var processingInformation = new cybersourceRestApi.Ptsv2paymentsProcessingInformation();
                processingInformation.commerceIndicator = 'internet';

                var subMerchant = new cybersourceRestApi.Ptsv2paymentsAggregatorInformationSubMerchant();
                subMerchant.cardAcceptorId = '1234567890';
                subMerchant.country = 'US';
                subMerchant.phoneNumber = '4158880000';
                subMerchant.address1 = '1 Market St';
                subMerchant.postalCode = '94105';
                subMerchant.locality = 'San Francisco';
                subMerchant.name = 'Visa Inc';
                subMerchant.administrativeArea = 'CA';
                subMerchant.region = 'PEN';
                subMerchant.email = 'test@cybs.com';

                var aggregatorInformation = new cybersourceRestApi.Ptsv2paymentsAggregatorInformation();
                aggregatorInformation.subMerchant = subMerchant;
                aggregatorInformation.name = 'V-Internatio';
                aggregatorInformation.aggregatorId = '123456789';

                var amountDetails = new cybersourceRestApi.Ptsv2paymentsOrderInformationAmountDetails();
                amountDetails.totalAmount = data.amount;
                amountDetails.currency = 'USD';

                var billTo = new cybersourceRestApi.Ptsv2paymentsOrderInformationBillTo();
                billTo.country = 'US';
                billTo.firstName = data.firstName;
                billTo.lastName = data.lastName;
                billTo.phoneNumber = '4158880000';
                billTo.address1 = 'test';
                billTo.postalCode = '94105';
                billTo.locality = 'San Francisco';
                billTo.administrativeArea = 'MI';
                billTo.email = 'test@cybs.com';
                billTo.address2 = 'Address 2';
                billTo.district = 'MI';
                billTo.buildingNumber = '123';
                billTo.company = 'Visa';

                var orderInformation = new cybersourceRestApi.Ptsv2paymentsOrderInformation();
                orderInformation.amountDetails = amountDetails;
                orderInformation.billTo = billTo;

                var paymentInformation = new cybersourceRestApi.Ptsv2paymentsPaymentInformation();
                // var card = new cybersourceRestApi.Ptsv2paymentsPaymentInformationCard();
                // card.expirationYear = '2031';
                // card.number = '4111111111111111';
                // card.expirationMonth = '03';
                // card.securityCode = data.securityCode;
                // card.type = '001';
                // paymentInformation.card = card;
                var customer = new cybersourceRestApi.Ptsv2paymentsPaymentInformationCustomer()
                customer.customerId = data.tokenizedCard;
                paymentInformation.customer = customer;
                var request = new cybersourceRestApi.CreatePaymentRequest();
                request.clientReferenceInformation = clientReferenceInformation;
                request.processingInformation = processingInformation;
                request.aggregatorInformation = aggregatorInformation;
                request.orderInformation = orderInformation;
                request.paymentInformation = paymentInformation;

                if (enableCapture === true) {
                        request.processingInformation.capture = true;
                }
                console.log('\n*************** Process Payment ********************* ');

                instance.createPayment(request, function (error, data, response) {
                        if (error) {
                                console.log('\nError in process a payment : ' + JSON.stringify(error));
                        } else if (data) {
                                console.log('\nData of process a payment : ' + JSON.stringify(data));
                        }
                        console.log('\nResponse of process a payment : ' + JSON.stringify(response));
                        console.log('\nResponse Code of process a payment : ' + JSON.stringify(response['status']));
                        callback(error, data);
                });
        } catch (error) {
                console.log(error);
        }
}
module.exports = app;