" The Ruby provider helper
if exists('g:loaded_node_provider')
  finish
endif
let g:loaded_node_provider = 1

let s:stderr = {}
let s:job_opts = {'rpc': v:true}

function! s:job_opts.on_stderr(chan_id, data, event)
  let stderr = get(s:stderr, a:chan_id, [''])
  let last = remove(stderr, -1)
  let a:data[0] = last.a:data[0]
  call extend(stderr, a:data)
  let s:stderr[a:chan_id] = stderr
endfunction

function! provider#node#Detect() abort
  echomsg exepath('neovim-node-host')
  return exepath('neovim-node-host')
endfunction

function! provider#node#Prog()
  return s:prog
endfunction

function! provider#node#Require(host) abort
  let args = ['node', provider#node#Prog()]
  let node_plugins = remote#host#PluginsForHost(a:host.name)

  for plugin in node_plugins
    call add(args, plugin.path)
  endfor

  try
    let channel_id = jobstart(args, s:job_opts)
    if rpcrequest(channel_id, 'poll') ==# 'ok'
      return channel_id
    endif
  catch
    echomsg v:throwpoint
    echomsg v:exception
    for row in get(s:stderr, channel_id, [])
      echomsg row
    endfor
  endtry
  throw remote#host#LoadErrorForHost(a:host.orig_name, '$NVIM_NODE_LOG_FILE')
endfunction

function! provider#node#Call(method, args)
  if s:err != ''
    echoerr s:err
    return
  endif

  if !exists('s:host')
    try
      let s:host = remote#host#Require('node-provider')
    catch
      let s:err = v:exception
      echohl WarningMsg
      echomsg v:exception
      echohl None
      return
    endtry
  endif
  return call('rpcrequest', insert(insert(a:args, 'node_'.a:method), s:host))
endfunction


let s:err = ''
let s:prog = provider#node#Detect()

if empty(s:prog)
  let s:err = 'Cannot find the neovim-client node package. Try :CheckHealth'
endif

" call remote#host#RegisterClone('legacy-node-provider', 'node')
call remote#host#RegisterPlugin('node-provider', 'node', [])
