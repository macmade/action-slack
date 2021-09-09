/*******************************************************************************
 * The MIT License (MIT)
 * 
 * Copyright (c) 2021 Jean-David Gadina - www.xs-labs.com
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 ******************************************************************************/

const core                  = require( '@actions/core' );
const github                = require( '@actions/github' );
const { IncomingWebhook }   = require( '@slack/webhook' );

function GetStatusColor( status )
{
    if( status.toLowerCase() === 'success'   ) return 'good'
    if( status.toLowerCase() === 'failure'   ) return 'danger'
    if( status.toLowerCase() === 'cancelled' ) return 'warning'
    
    return 'warning'
}

function GetStatusText( status )
{
    if( status.toLowerCase() === 'success'   ) return 'Success'
    if( status.toLowerCase() === 'failure'   ) return 'Failure'
    if( status.toLowerCase() === 'cancelled' ) return 'Cancelled'
    
    return 'Unknown'
}

function GetEnv()
{
    const server        = process.env.GITHUB_SERVER_URL;
    const repository    = process.env.GITHUB_REPOSITORY;
    const runID         = process.env.GITHUB_RUN_ID;
    const env           =
    {
        os:             process.env.RUNNER_OS,
        event:          process.env.GITHUB_EVENT_NAME,
        job:            process.env.GITHUB_JOB,
        workflow:       process.env.GITHUB_WORKFLOW,
        workflowURL:    `${server}/${repository}/actions/runs/${runID}`,
        runID:          process.env.GITHUB_RUN_ID,
        runNumber:      process.env.GITHUB_RUN_NUMBER,
        repository:     process.env.GITHUB_REPOSITORY,
        repositoryURL:  `${server}/${repository}`,
        commit:         process.env.GITHUB_SHA.slice( 0, 8 ),
        branch:         process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF.replace( 'refs/heads/', '' ),
        actor:          process.env.GITHUB_ACTOR
    };
    
    return env;
}

function GetSender()
{
    var sender = 
    {
        name: process.env.GITHUB_ACTOR,
        link: `https://github.com/${process.env.GITHUB_ACTOR}`,
        icon: ''
    };
    
    switch( process.env.GITHUB_EVENT_NAME )
    {
        case 'issues':
        case 'issue_comment':
        case 'pull_request':
        case 'push':
            
            sender.name = github.context.payload.sender.login;
            sender.link = github.context.payload.sender.html_url;
            sender.icon = github.context.payload.sender.avatar_url;
            
            break;
            
        default:
            
            break;
    }
    
    return sender;
}

function GetLinks()
{
    const env   = GetEnv();
    const links =
    {
        job:        `<${env.workflowURL}|${env.job}#${env.runNumber}>`,
        repository: `<${env.repositoryURL}|${env.repository}>`,
        branch:     `<${env.repositoryURL}/tree/${env.branch}|${env.branch}>`,
        commit:     `<${env.repositoryURL}/commit/${env.commit}|${env.commit}>`
    };
    
    return links;
}

try
{
    const channel    = core.getInput( 'channel' );
    const status     = core.getInput( 'status' );
    const extraTitle = core.getInput( 'title' );
    const extraText  = core.getInput( 'text' );
    
    const env    = GetEnv();
    const sender = GetSender();
    const links  = GetLinks();
    
    const statusText = GetStatusText( status );
    const now        = Math.round( new Date().getTime() / 1000 );
    
    const webhook = new IncomingWebhook( process.env.SLACK_WEBHOOK_URL );
    const message =
    {
        channel:    `${channel}`,
        attachments:
        [
            {
                fallback:       `Job ${env.job}#${env.runNumber}: ${statusText} on ${env.os}`,
                ts:             now.toString(),
                color:          GetStatusColor( status ),
                author_name:    sender.name,
                author_link:    sender.link,
                author_icon:    sender.icon,
                text:           `Job ${links.job}: ${statusText} on ${env.os}`,
                footer:         `${links.repository} on ${links.branch} @ ${links.commit}`,
                footer_icon:    'https://github.githubassets.com/favicon.ico',
                fields:
                [
                    {
                        title: `${extraTitle}`,
                        value: `${extraText}`,
                        short: 'false'
                    }
                ]
            }
        ]
    };
    
    ( async () => { await webhook.send( message ); } )();
}
catch( error )
{
    core.setFailed( error.message );
}
