/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Meta Tag and Header Module
 * All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * 
 * USAGE:
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * 
 * You are permitted to use this software for personal and commercial
 * applications, provided the following conditions are met:
 * 1. The origin of this software must not be misrepresented; you must
 *	not claim that you wrote the original software.
 * 2. Altered source versions must be plainly marked as such, and must
 *	not be misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source
 *	distribution.
 * 
 * CONTEXT:
 * This module provides utility functions for various purposes such as
 * META tags and styles within head html elements
 * 
 * Need To-Do:
 */

/** Generates head metadata and styles for different pages.
 * @param {string} page - The page identifier ('index', 'chat', 'profile', 'terms', 'about').
 * @param {object} data - Domain information.
 * @param {object} [profile={}] - User profile data.
 * @param {object} [room={}] - Chat room data.
 * @returns {object} Combined metadata and styles for the specified page.
 */
const getHeadData = (page, data, profile = {}, room = {}) => {
    const commonMeta = {
        charset: 'UTF-8',
        viewport: 'width=device-width, initial-scale=1.0',
        author: 'BadNintendo',
        themeColor: '#ffffff',
        image: `${data.domain}/images/logo.png`,
        robots: 'index, follow',
        twitterSite: '@OfficialStickPM',
        favicon: '/images/fav.ico'
    };
    const stylesPlain = `
        <style>
			html {
			  --header-size               : 125px;
			  --scrollbar-height          : 3px;
			  --scrollbar-bg              : #ddd;
			  --scrollbar-progress-color  : #0089f2;
			}

			header {
			  position         : fixed;
			  top              : 0;
			  height           : var(--header-size);
			  width            : 100%;
			  background       : white;
			  padding          : 1rem 2rem;
			}

			main {
			  margin-top       : calc(var(--header-size) + var(--scrollbar-height));
			  padding          : 2rem;
			}

			body {
			  background       : linear-gradient(
								   to right top,
								   var(--scrollbar-progress-color) 50%,
								   var(--scrollbar-bg) 50%
								 );
			  background-size  : 100% calc(100% - 100vh + var(--header-size) + var(--scrollbar-height) + 1px);
			  background-repeat: no-repeat;
			  margin           : 0;
			  font-family      : "Open Sans", sans-serif;
			}

			body::before {
			  content          : "";
			  position         : fixed;
			  top              : calc(var(--header-size) + var(--scrollbar-height));
			  bottom           : 0;
			  width            : 100%;
			  z-index          : -1;
			  background       : white;
			}

			* {
			  box-sizing       : border-box;
			}
            h1, h3, p, ul {
                margin-bottom   : 1rem;
                line-height     : 1.5;
            }
            ul {
                list-style-type : disc;
                margin-left     : 1.5rem;
            }
            a {
                color           : #0089f2;
                text-decoration : none;
            }
            a:hover {
                text-decoration : underline;
            }
    </style>
    `;
    const headData = {
        index: {
            title: 'StickPM - Leading Chatroom & Streaming Platform',
            description: 'StickPM - The chatrooms and streaming platform. Join us for live streams, chatting, and the latest design and creative enhancements for social hangouts.',
            keywords: 'stream, gaming, streaming, live, live streaming, chatroom, chat, room',
            image: `${data.domain}/images/logo.png`,
            url: `${data.domain}`
        },
        chat: {
            title: `${room.name || 'StickPM'} - StickPM Chatroom Streaming App`,
            description: room.topic && room.topic.trim() !== ''? room.topic : 'Join StickPM for a seamless chatroom and streaming experience.',
            keywords: 'StickPM, chatroom, streaming, live, video, audio, chat',
            image: `//${data.subDomain}.${data.domain}/images/logo.png`,
            url: `//${data.subDomain}.${data.domain}/${room.name || 'lobby'}`,
            usersCount: room.users?.length > 2 ? `Room has ${room.users.length} users.` : '',
            currentDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        },
        profile: {
            title: `StickPM - Profile ${profile.username || 'Page'}`,
            description: `StickPM - Profile ${profile.username || 'User'} - Joined Date: ${profile.joinDate || 'Unknown'}`,
            keywords: `stream, gaming, streaming, live, live streaming, chatroom, chat, room, ${profile.username || 'user'}`,
            image: profile.profilePhoto || `//${data.domain}/images/logo.png`,
            url: `//${data.domain}/profile/${profile.username || 'users'}` //may change to admin as default
        },
        users: {
            title: `StickPM - Memberlist Page`,
            description: `StickPM - Profiles of members listed for easier interactions.'}`,
            keywords: `stream, gaming, streaming, live, live streaming, chatroom, chat, room, users`,
            image: `//${data.domain}/images/logo.png`,
            url: `//${data.domain}/profiless`,
            style: `
            <style>
                .profiles-container {}
                .profile-card {
                    width: 250px;
                    height: 250px;
                    position: relative;
                    margin: 10px;
                    overflow: hidden;
                    transition: height 0.3s ease;
                }
                .profile-card:hover {
                    height: 500px;
                }
                .profile-photo {
                    width: 100%;
                    height: 150px;
                    position: relative;
                    background-size: cover;
                    border-radius: 5px;
                    border: 3px solid transparent;
                }
                .profile-photo.vip {
                    border-color: orange;
                }
                .profile-card .bio {
                    font-size: 0.9em;
                    margin-top: 10px;
                }
                .profile-card .join-date {
                    font-size: 0.8em;
                    color: #666;
                }
                .profile-card .username {
                    font-size: 1.2em;
                    font-weight: bold;
                }
                .profile-card .following {
                    color: green;
                }
                .profile-photo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .watermark {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    font-size: 1.5em;
                    color: rgba(255, 255, 255, 0.3);
                    text-align: center;
                    line-height: 150px;
                    z-index: 1;
                }
            </style>`
        },
        terms: {
            title: 'StickPM - Terms of Service and User Agreement',
            description: 'Explore StickPM\'s Terms of Service. Learn about user responsibilities, room management, virtual credits, and community guidelines for chatrooms and streaming.',
            keywords: 'StickPM, terms, service, user agreement, virtual credits, chatroom, streaming, community guidelines, VIP, room creation',
            image: `${data.domain}/images/logo.png`,
            url: `${data.domain}/terms`,
            style: stylesPlain
        },
        about: {
            title: 'StickPM - About Us | Discover the Future of Social Chatrooms & Streaming',
            description: 'StickPM is a next-gen platform where you can join chatrooms, broadcast live streams, and participate in social hangouts. Learn more about our platform\'s mission, features, and offerings here.',
            keywords: 'StickPM, chatrooms, live streaming, social platform, community, video streaming, social hangouts, StickPM About',
            image: `${data.domain}/images/logo.png`,
            url: `${data.domain}/about`,
            style: stylesPlain
        }
    };
    return {
        ...commonMeta,
        ...headData[page]
    };
};

module.exports = { getHeadData };